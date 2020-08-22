"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpsBatteryServiceAccessory = void 0;
const apcaccess_1 = __importDefault(require("apcaccess"));
/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
class UpsBatteryServiceAccessory {
    constructor(platform, log, config, api, accessory) {
        this.platform = platform;
        this.log = log;
        this.config = config;
        this.api = api;
        this.accessory = accessory;
        this.batteryService = this.accessory.getService(this.platform.Service.BatteryService) || this.accessory.addService(this.platform.Service.BatteryService);
        // set HomeKit accessory name
        this.batteryService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.displayName);
        const Characteristic = this.api.hap.Characteristic;
        // create handlers for required characteristics
        this.batteryService.getCharacteristic(Characteristic.BatteryLevel)
            .on('get', this.handleBatteryLevelGet.bind(this));
        this.batteryService.getCharacteristic(Characteristic.ChargingState)
            .on('get', this.handleChargingStateGet.bind(this));
        this.batteryService.getCharacteristic(Characteristic.StatusLowBattery)
            .on('get', this.handleStatusLowBatteryGet.bind(this));
        // set accessory information
        // this.accessory.getService(this.platform.Service.AccessoryInformation)!
        //   .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Default-Manufacturer')
        //   .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
        //   .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');
        this.currentStatus = {
            batteryLevel: 0,
            isCharging: false,
            isLowBattery: false,
        };
        const apcAccessClient = new apcaccess_1.default();
        let apcAccessConnected = false;
        setInterval(() => {
            apcAccessClient.connect('127.0.0.1', '3551').then(() => {
                return apcAccessClient.getStatusJson();
            }).then((result) => {
                apcAccessConnected = true;
                this.processStatus(result);
            }).catch((err) => {
                this.log.error('APC error: ' + err.toString());
            }).finally(() => {
                if (apcAccessConnected) {
                    apcAccessClient.disconnect()
                        .then(() => {
                        apcAccessConnected = false;
                    })
                        .catch((err) => {
                        apcAccessConnected = false;
                        this.log.error('APC disconnect error: ' + err.toString());
                    });
                }
            });
        }, 5000);
    }
    processStatus(result) {
        this.lastStatus = this.currentStatus;
        // STATUS: string, // ONLINE / ONBATT
        // BCHARGE: string, // '100.0 Percent'
        // TIMELEFT: string, // '36.4 Minutes'
        const getBatteryLevel = () => {
            const percentage = parseFloat(result.BCHARGE.split(' ')[0]);
            if ((!isNaN(percentage)) && (0 <= percentage) && (percentage <= 100))
                return percentage;
            return 0;
        };
        const batteryLevel = getBatteryLevel();
        this.currentStatus = {
            batteryLevel,
            isCharging: (batteryLevel < 100 && (this.lastStatus && this.lastStatus.batteryLevel > 0 && this.lastStatus.batteryLevel < batteryLevel)),
            isLowBattery: batteryLevel < 10,
        };
    }
    /**
     * Handle requests to get the current value of the "Battery Level" characteristic
     */
    handleBatteryLevelGet(callback) {
        this.log.debug('Triggered GET BatteryLevel');
        callback(null, Math.floor(this.currentStatus.batteryLevel));
    }
    /**
     * Handle requests to get the current value of the "Charging State" characteristic
     */
    handleChargingStateGet(callback) {
        this.log.debug('Triggered GET ChargingState');
        callback(null, this.currentStatus.isCharging ? 1 : 0);
    }
    /**
     * Handle requests to get the current value of the "Status Low Battery" characteristic
     */
    handleStatusLowBatteryGet(callback) {
        this.log.debug('Triggered GET StatusLowBattery');
        callback(null, this.currentStatus.isLowBattery ? 1 : 0);
    }
}
exports.UpsBatteryServiceAccessory = UpsBatteryServiceAccessory;
//# sourceMappingURL=platformAccessory.js.map