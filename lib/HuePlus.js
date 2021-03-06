const util = require("./util");
const SerialPort = require("serialport");
const waitUntil = require("wait-until");
const DeviceNotFound = require("./ErrorTypes").DeviceNotFound;
const modes = {
    fixed: 0x00,
    fading: 0x01,
    spectrum: 0x02,
    marquee: 0x03,
    coveringMarquee: 0x04,
    alternating: 0x05,
    pulse: 0x06,
    breathing: 0x07,
    candle: 0x09,
    wings: 0x0c,
    wave: 0x0d
}
let port; // Serial port, not to be confused with the ports variable
let timeout = 10;
let ports = {
    ch0: 0, // Total number of LEDs
    ch1: {
        type: "led",
        count: 0
    },
    ch2: {
        type: "led",
        count: 0
    }
}

class HuePlus {
    constructor(serialPort) {
        let t = this;
        this.turnOnLED = turnOnLED;
        this.turnOffLED = turnOffLED;
        this.getLEDCount = getLEDCount;
        this.clear = clear;
        this.modes = modes;
        this.restoreDevice = restoreDevice;
        
        this.changeColor = changeColor;
        this.fixed = fixed;
        this.fading = fading;
        this.spectrum = spectrum;
        this.marquee = marquee;
        this.coveringMarquee = coveringMarquee;
        this.alternating = alternating;
        this.pulse = pulse;
        this.breathing = breathing;
        this.candle = candle;
        this.wings = wings;
        this.wave = wave;

        return new Promise((resolve, reject) => {
            if (typeof serialPort === "undefined") {
                SerialPort.list().then((list) => {
                    for (let i = 0; i < list.length; i++) {
                        if (!list[i].vendorId || !list[i].productId) continue;
                        if (list[i].vendorId.toLowerCase() === "04d8" && list[i].productId.toLowerCase() === "00df") {
                            port = new SerialPort(list[i].comName, { baudRate: 256000}, (err) => {
                                if (err) return reject(new HuePlusError("There was an error when connecting to the NZXT HUE+: "  + err));
                                write([0xc0]).then(() => {
                                    getLEDCount().then(() => resolve(this));
                                }).catch(reject);
                            });
                            break;
                        } else if (i === list.length - 1) {
                            return reject(new DeviceNotFound("Could not find NZXT HUE+"));
                        }
                    }
                }).catch(() => { return reject(new DeviceNotFound("Could not get a list of connected serial devices")); } )
            } else {
                port = new SerialPort(serialPort, { baudRate: 256000 }, (err) => {
                    if (err) return reject(new DeviceNotFound("Could not find NZXT HUE+ at the port specified"));
                    write([0xc0]).then(() => {
                        getLEDCount().then(() => resolve(this));
                    }).catch(reject);
                });
            }
        })
    }
    get ledCount() {
        return ports;
    }
}

function write(buffer, alt = false) {
    return new Promise((resolve, reject) => {
        let output = [];

        port.open((err) => {
            if (err && err.message !== "Port is already open")  {
                return reject(new HuePlusError("There was an error when opening the HUE+: " + err));
            }
            port.on("data", (data) => {
                alt ? output.push(...data) : output.push(data.readUInt8());
            });
            port.write(buffer, (err) => {
                if (err) {
                    port.close(() => {
                        return reject(new HuePlusError("There was an error when writing to the HUE+: " + err));
                    });
                }
                waitUntil(timeout, 100, alt ? () => { return output.length >= 5 } : () => { return output[0] === 1 }, result => {
                    port.removeAllListeners("data");
                    port.close(() => {
                        if (result) {
                            setTimeout(() => { return resolve(alt ? output.slice(3, 5) : output) }, timeout);
                        } else {
                            return reject(new HuePlusError("The HUE+ did not respond"));
                        }
                    })
                });
            });
        });
    })
}

function fixed(color, channel, custom = false) {
    return new Promise((resolve, reject) => {
        changeColor(color, modes.fixed, channel, 0, 0, false, false, custom).then(resolve).catch(reject);
    })
}

function fading(color, channel, speed = 3) {
    return new Promise((resolve, reject) => {
        changeColor(color, modes.fading, channel, speed).then(resolve).catch(reject);
    })
}

function spectrum(channel, speed = 3, backwards = false) {
    return new Promise((resolve, reject) => {
        changeColor("ffffff", modes.spectrum, channel, speed, 0, false, backwards).then(resolve).catch(reject);
    })
}

function marquee(color, channel, speed = 3, size = 3, backwards = false) {
    return new Promise((resolve, reject) => {
        changeColor(color, modes.marquee, channel, speed, size, false, backwards).then(resolve).catch(reject);
    })
}

function coveringMarquee(color, channel, speed = 3, backwards = false) {
    return new Promise((resolve, reject) => {
        changeColor(color, modes.coveringMarquee, channel, speed, 0, false, backwards).then(resolve).catch(reject);
    })
    
}

function alternating(color, channel, speed = 3, size = 3, moving = false, backwards = false) {
    return new Promise((resolve, reject) => {
        changeColor(color, modes.alternating, channel, speed, size, moving, backwards).then(resolve).catch(reject);
    })
    
}

function pulse(color, channel, speed = 3) {
    return new Promise((resolve, reject) => {
        changeColor(color, modes.pulse, channel, speed).then(resolve).catch(reject);
    })
    
}

function breathing(color, channel, speed = 3, custom = false) {
    return new Promise((resolve, reject) => {
        changeColor(color, modes.breathing, channel, speed, 0, false, false, custom).then(resolve).catch(reject);
    })
    
}

function candle(color, channel) {
    return new Promise((resolve, reject) => {
        changeColor(color, modes.candle, channel).then(resolve).catch(reject);
    })
    
}

function wings(color, channel, speed = 3) {
    return new Promise((resolve, reject) => {
        changeColor(color, modes.wings, channel, speed).then(resolve).catch(reject);
    })
    
}

function wave(color, channel, speed = 3) {
    return new Promise((resolve, reject) => {
        changeColor(color, modes.wave, channel, speed, 0, false, false, true).then(resolve).catch(reject);
    })
    
}

function turnOnLED() {
    return new Promise((resolve, reject) => {
        let output = 0;
        write([0x46, 0x00, 0xc0, 0x00, 0x00, 0x00, 0xff]).then(resolve).catch(reject);
    })
};

function turnOffLED() {
    return new Promise((resolve, reject) => {
        write([0x46, 0x00, 0xc0, 0x00, 0x00, 0xff, 0x00]).then(resolve).catch(reject);
    })
};

function clear(channel) {
    return new Promise((resolve, reject) => {
        let output = 0;
        let buffer = [0x4b, channel];
        for (let i = 0; i < 124; i++) {
            buffer.push(0x00);
        }
        write(buffer).then(resolve).catch(reject);
    })

}

function getLEDCount() {
    return new Promise(async (resolve, reject) => {
        try {
            // Get info about channels
            let ch1 = await write([0x8d, 0x01], true);
            let ch2 = await write([0x8d, 0x02], true);

            // Update ports variable
            ports.ch1.type = ch1[0] === 0x01 ? "fan" : "led";
            ports.ch1.count = ch1[1];
            ports.ch2.type = ch2[0] === 0x01 ? "fan" : "led";
            ports.ch2.count = ch2[1];
            ports.ch0 = ch1[1] + ch2[1];
            
            return resolve([ch1[1], ch2[1]]);
        } catch (err) {
            return reject(new HuePlusError("Could not get the number of LEDs connected: " + err.message));
        }
    })
}

function restoreDevice() {
    // In case the device gets stuck for whatever reason
    return new Promise((resolve, reject) => {
        let output = 0;
        let interval = setInterval(() => {
            port.write([0xc0], 500)
            if (output === 0x01) {
                clearInterval(interval);
                resolve();
            }
        }, timeout)
        port.on("data", (data) => {
            port.removeAllListeners("data");
            output = data.readUInt8();
        });
    })
}

function changeColor(color, mode, channel, speed = 3, size = 3, moving = false, backwards = false, custom = false, i = 0, ledCount) {
    return new Promise(async (resolve, reject) => {
        if (typeof color !== "string" && typeof color !== "object") return reject(new TypeError("Invalid color: use hex code (ex. #FFFFFF)"));
        if (typeof color === "object" && color.length > 8 && !custom) return reject(new "Max limit for color length is 8 for a noncustom mode");
        if (typeof mode !== "number") mode = modes[mode];
        if (typeof mode === "undefined") return reject(new TypeError("Invalid mode"));
        if (!custom && mode === modes.wave) return reject(new RangeMode("Wave mode is only available for custom presets"));
        if (typeof channel !== "number" || channel < 0 || channel > 2) return reject(new TypeError("Channel must an integer between 0 and 2"));
        if ((mode === modes.coveringMarquee || mode === modes.marquee) && channel === 0) return reject(new TypeError("Channel can't be 0 for covering marquee/marquee modes"))
        if (typeof speed !== "number" || speed < 0 || speed > 5) return reject(new TypeError("Speed must be an integer between 1 and 5"));
        if (typeof size !== "number" || size < 0 || size > 4) return reject(new TypeError("Size must be an integer between 1 and 4"));
        if (speed === 0) speed++; if (size === 0) size++;
        if (typeof moving !== "boolean") return reject(new TypeError("Moving must be a boolean"));
        if (typeof backwards !== "boolean") return reject(new TypeError("Backwards must be a boolean"));
        if (typeof custom !== "boolean") return reject(new TypeError("Custom must be a boolean"));

        if (typeof color !== "object" && mode === modes.alternating && color.length !== 2) return reject(new RangeError("Color must be an array of 2 colors for Alternating mode"));
        if (custom && (typeof color !== "object" || color.length !== 40)) return reject(new RangeError("Color must be an array of 40 colors when using a custom preset"));
        if (custom && (mode !== modes.fixed && mode !== modes.breathing && mode !== modes.wave)) return reject(new TypeError("Custom preset is only allowed for Fixed, Breathing, and Wave modes"));

        if (channel === 0) ledCount = ports.ch0; else ledCount = ports["ch" + channel.toString()].count;
        if (channel === 0) return reject(new RangeError("Channel 0 is temporarily disabled for compatibility with NZXT Aer RGB fans."));
        let _ledCount = ledCount; // Keep original LED count
        if (ledCount > 0) ledCount--; // LED count starts at 0 ( ͡° ͜ʖ ͡°)
        if (custom) ledCount++; // LED Count gets incremented by 1 when using a custom preset
        speed -= 1; size -= 1; // Speed/size also starts at 0
        let multiplier = channel !== 0 && ports["ch" + channel.toString()].type === "fan" ? 8 : 10 // Multiplier based on the type of device (LED/fan)
        let buffer = [0x4b, channel, mode];
        
        switch (mode) {
            case modes.fixed:
                buffer.push(ledCount, 0x02); // I don't know what the 0x02 is for, but NZXT's software uses it
                break;
            case modes.fading:
                buffer.push(ledCount, speed);
                break;
            case modes.spectrum:
                buffer.push((backwards ? ledCount + 16 : ledCount), speed);
                break;
            case modes.marquee:
                buffer.push((backwards ? ledCount + 16 : ledCount), speed + size * 8);
                break;
            case modes.coveringMarquee:
                buffer.push((backwards ? ledCount + 16 : ledCount), speed);
                break;
            case modes.alternating:
                if (moving) ledCount += 8;
                buffer.push((backwards ? ledCount + 16 : ledCount), speed + size * 8);
                break;
            case modes.pulse:
                buffer.push(ledCount, speed);
                break;
            case modes.breathing:
                buffer.push(ledCount, speed);
                break;
            case modes.candle:
                buffer.push(ledCount, 0x00);
                break;
            case modes.wings:
                buffer.push(ledCount, speed);
                break;
            case modes.wave:
                buffer.push(ledCount, speed);
                break;
        }

        buffer[4] += i * 0x20;
        
        if (mode === modes.spectrum) {
            for (let x = 0; x < _ledCount * multiplier; x++) {
                buffer = buffer.concat([0x00, 0x00, 0xff]);
            }
        } else {
            for (let x = 0; x < _ledCount * multiplier; x++) {
                if (custom) { buffer = buffer.concat(util.hexToGRB(color[x])); }
                else { buffer = buffer.concat(util.hexToGRB( typeof color === "string" ? color : color[i] )); }
            }
        }

        if ((_ledCount < 4 && ports["ch" + channel].type === "led") || (_ledCount < 5 && ports["ch" + channel].type === "fan")) {
            for (let x = 0; x < 40 - (_ledCount) * multiplier; x++) {
                buffer = buffer.concat([0x00, 0x00, 0x00]);
            }
        }

        if (buffer.length !== 125) return reject(new HuePlusError(`A malformed command was created (length: ${buffer.length}, must be 125)`)); // Check if buffer's length equals 125

        write(buffer).then(() => {
            if (typeof color === "object" && !custom && i < color.length - 1) {
                changeColor(color, mode, channel, ++speed, ++size, backwards, moving, custom, ++i, _ledCount).then(resolve).catch(reject);
            } else resolve();
        }).catch(reject);
    })
}

class HuePlusError extends Error {
    constructor(err = "An error occured") {
        super(err);
        this.name = "HuePlusError";
        this.message = err;
        this.deviceID = "hueplus";
        this.deviceName = "NZXT HUE+";
        Error.captureStackTrace(this, HuePlusError)
    }
}

module.exports = HuePlus;