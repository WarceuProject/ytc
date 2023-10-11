const cp = require("child_process");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const env = process.env;
const xlog = {
    log() {
        console.log.apply(this, arguments);
    },
    info() {
        arguments[0] = `\x1b[92minfo\x1b[0m ${arguments[0]}`;

        this.log.apply(this, arguments);
    },
    error() {
        arguments[0] = `\x1b[91merror\x1b[0m ${arguments[0]}`;

        this.log.apply(this, arguments);
    },
    warn() {
        arguments[0] = `\x1b[93mwarn\x1b[0m ${arguments[0]}`;

        this.log.apply(this, arguments);
    },
    debug() {
        arguments[0] = `\x1b[96mdebug\x1b[0m ${arguments[0]}`;

        this.log.apply(this, arguments);
    },
    fatal() {
        arguments[0] = `\x1b[41;97m fatal \x1b[0m ${arguments[0]}`;

        this.log.apply(this, arguments);
    }
};

function Ytdlp() {
    const args = arguments.length > 1 ? Array.from(arguments) : arguments[0]?.split(" ");
    const cmd = path.join(__dirname, env.YTDLP);
    const noStdout = !!(args.includes("--no-stdout") && args.splice(args.indexOf("--no-stdout"), 1));

    xlog.info("\x1b[90m[ytdlp][spawn]\x1b[0m %s", [cmd].concat(args).join(" "));

    return new Promise(async (resolve, reject) => {
        const task = cp.exec([cmd, ...args].join(" "), (err, stdout, stderr) => {
            console.log("\x1b[90mProcessing request\x1b[0m %s\x1b[0m", !stderr ? "\x1b[1;32m[done]" : "\x1b[1;31m[failed]");

            if (err) {
                reject(stderr?.trim()?.split("\n")?.slice(-1)[0].replace(/ERROR:\s+(\[.+\]\s+)?/g, ""));
            }

            resolve({ err, stdout, stderr });
        });

        task.stdout.on("data", stdout => {
            if (stdout && !noStdout) {
                xlog.info("\x1b[90m[ytdlp][stdout]\x1b[0m %s", stdout.toString().trim());;
            }
        });
        task.stderr.on("data", stderr => {
            if (stderr) {
                xlog.error("\x1b[90m[ytdlp][stderr]\x1b[0m %s", stderr.toString().trim());
            }
        });
        task.on("error", err => {
            xlog.fatal("\x1b[90merr\x1b[0m %s", err);
        });
        task.on("exit", code => {
            console.log("\x1b[90mProcess closed with exit code 0x%s\x1b[0m", code.toString(16));
        });
    });
}

function parseInfo(info) {
    const formats = info.formats;
    const formatsFactory = formats.reduce((obj, media) => {
        const ext = media.ext;
        const res = media.height || "noresolution";
        let mediaExtensions = obj[ext];
        let mediaResolutions = mediaExtensions?.[res];

        if (!mediaExtensions) {
            mediaExtensions = obj[ext] = {};
        }
        if (!mediaResolutions) {
            mediaResolutions = mediaExtensions[res] = [];
        }
        if (mediaResolutions instanceof Array) {
            const excludeMediaFields = ["http_headers", "fragments"];
            const mediaResult = Object.fromEntries(Object.entries(media).map(([k, v]) => [k, excludeMediaFields.includes(k) ? null : v]));

            mediaResolutions.push(mediaResult);
        }
        
        return obj;
    }, {});
    const reqFormatsFactory = info.requested_formats && info.requested_formats.reduce((obj, media) => {
        const ext = media.ext;
        const res = media.height || "noresolution";
        const mediaExtensions = formatsFactory[ext];
        const mediaResolutions = mediaExtensions?.[res];

        if (mediaExtensions && mediaResolutions instanceof Array) {
            const formatId = media.format_id;
            const findIndexMedia = mediaResolutions.findIndex(e => e.format_id === formatId);

            if (typeof findIndexMedia === "number" && findIndexMedia !== -1) {
                obj.push({ ext, res, height: media.width, indexMedia: findIndexMedia });
            }
        }

        return obj;
    }, []);
    const ytdlpExcludeResponseFields = "formats,requested_formats,automatic_captions,_filename,_version,subtitles".split(",");
    const responseInfo = Object.assign(Object.fromEntries(Object.entries(info).filter(([k]) => !ytdlpExcludeResponseFields.includes(k))), {
        formats: formatsFactory,
        requested_formats: reqFormatsFactory || {}
    });

    return responseInfo;
}

class ProcessAudio {
    constructor(LintxMPDLo) {
        Object.assign(this, LintxMPDLo);
        this.resolve = LintxMPDLo.resolve;
    }
    quality(bitrate) {
        const validBitrateNumber = typeof bitrate === "number";
        const validBitrateString = typeof bitrate === "string";
        const withUnit = bitrate && /^\d+k?(bps)?$/gi.test(bitrate);
        const validBitrateValue = validBitrateNumber || validBitrateString && withUnit;

        if (bitrate && !(validBitrateNumber || validBitrateString)) {
            throw TypeError("Audio quality must be a \"number\" or \"string\" received \"" + typeof bitrate + "\"");
        }
        if (bitrate && !validBitrateValue) {
            throw Error("Audio quality \"" + bitrate + "\" must be valid vbr value");
        }

        this.options.audioBitrate = (validBitrateValue && bitrate.toString().replace(/\D+/gi, "") + "kbps") || this.defaultOptions.audioBitrate;

        return this;
    }
    format(ftype) {
        const validFtypeString = typeof ftype === "string";
        const validFtypeValue = validFtypeString && this.defaultOptions.audioSupportFormats.has(ftype);

        if (ftype && !validFtypeString) {
            throw TypeError("Audio format must be a \"string\" received \"" + typeof ftype + "\"");
        }
        if (ftype && !validFtypeValue) {
            throw Error("Audio format \"" + ftype + "\" not supported");
        }

        this.options.audioFormat = ftype || this.defaultOptions.audioFormat;

        return this;
    }
    async short() {
        const response = await this.resolve();

        return response.media;
    }
    async full() {
        const response = await this.resolve();

        return response;
    }
}

class ProcessVideo {
    constructor(LintxMPDLo) {
        Object.assign(this, LintxMPDLo);
        this.resolve = LintxMPDLo.resolve;
    }
    quality(resolution) {
        const validResolutionNumber = typeof resolution === "number";
        const validResolutionString = typeof resolution === "string";
        const validResolutionValue = validResolutionNumber || validResolutionString && /^\d+(p)?$/gi.test(resolution);
        
        if (resolution && !(validResolutionNumber || validResolutionString)) {
            throw TypeError("Video resolution must be a \"number\" or \"string\" received \"" + typeof resolution + "\"");
        }
        if (resolution && !validResolutionValue) {
            throw Error("Video resolution \"" + resolution + "\" must be valid youtube video quality");
        }

        this.options.videoResolution = (validResolutionValue && resolution.toString().replace(/\D+/gi, "") + "p") || this.defaultOptions.videoResolution;
    
        return this;
    }
    format(ftype) {
        const validFtypeString = typeof ftype === "string";
        const validFtypeValue = ftype && this.defaultOptions.videoSupportFormats.has(ftype);

        if (ftype && !validFtypeString) {
            throw TypeError("Audio format must be a \"string\" received \"" + typeof ftype + "\"");
        }
        if (ftype && !validFtypeValue) {
            throw Error("Audio format \"" + ftype + "\" not supported");
        }

        this.options.videoFormat = ftype || this.defaultOptions.videoFormat;

        return this;
    }
    async short() {
        const response = await this.resolve();

        return response.media;
    }
    async full() {
        const response = await this.resolve();

        return response;
    }
}

class LintxMPDL {
    options = {
        audioBitrate: null,
        audioFormat: null,
        videoResolution: null,
        videoFormat: null
    }
    defaultOptions = {
        audioBitrate: "125kbps",
        audioFormat: "mp3",
        audioSupportFormats: new Set(["mp3"]),
        videoResolution: "360p",
        videoFormat: "mp4",
        videoSupportFormats: new Set(["mp4"])
    }
    type = void 0
    constructor(url) {
        if (!url) {
            throw Error("Undefined or missing youtube URL");
        }

        this.url = url;
    }
    async resolve(type) {
        const validType = type && /^audio|video$/gi.test(type);

        // using default options
        for (let k in this.options) {
            const option = this.options[k];
            const defaultOption = this.defaultOptions[k];

            if (!option) {
                
                this.options[k] = defaultOption;
            }

            xlog.warn("%s\x1b[0m %s %s\x1b[0m", (!option ? "\x1b[2;94mdefault" : "\x1b[94moption"), k, (!option ? this.defaultOptions[k] : this.options[k]));
        }

        if (!this.type && (!type || !validType)) {
            throw Error("Type must be a \"video\" or \"audio\" received \"" + (type || null) + "\"");
        }

        const isVideo = (this.type || type) === "video";
        const isAudio = (this.type || type) === "audio";
        const { stdout } = await Ytdlp(`${this.url} -j --no-stdout`);
        const info = stdout && parseInfo(JSON.parse(stdout));
        const audioFormat = this.options.audioFormat;
        const audioBitrate = this.options.audioBitrate;
        const videoFormat = this.options.videoFormat;
        const videoResolution = this.options.videoResolution.replace(/\D+/gi, "");

        if (isVideo) {
            const foundVideoWithResolution = info.formats && Object.values(Object.fromEntries((Object.entries(info.formats).filter(([k, v]) => v[videoResolution] instanceof Array && v[videoResolution].length)).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).filter(([k_]) => k_ === videoResolution))])));

            xlog.info("Found %s related videos with resolution/quality %sp", foundVideoWithResolution.length, videoResolution);

            if (!foundVideoWithResolution.length) {
                throw Error("Video quality \"" + videoResolution + "p\" not available");
            }
        }
        
        const ytdlpAudioConvert = `-x --audio-format ${audioFormat} --audio-quality ${audioBitrate}`;
        const ytdlpVideoConvert = `--recode-video ${videoFormat}`;
        const filePath = path.join(__dirname, env[(isVideo ? "VIDEO" : "AUDIO") + "_TMP"]);
        const cmdDownload = `${this.url} -f "wv*[height=${videoResolution}]+wa*${isAudio ? "/ (wv*+ba*/w) / (bv*+ba*/b)" : ""}" ${isVideo ? ytdlpVideoConvert : ytdlpAudioConvert} -o ${filePath}`;
        const { err } = await Ytdlp(cmdDownload);
        const fileReady = !err && fs.existsSync(filePath);

        if (!fileReady) {
            throw Error("Something error, please try again");
        }

        const mediaBuffer = fs.readFileSync(filePath);
        const mediaBinary = mediaBuffer.toString("base64") || Buffer.from([null]);
        const mediaSize = cp.execSync(`du -h ${filePath} | awk '{ print $1 }'`).toString().trim() || "unknown";
        const mediaBitrate = cp.execSync(`ffprobe -i ${filePath} 2>&1 | grep bitrate | awk '{ print $6 }'`).toString().trim().concat("kbps") || "unknown";
        const mediaBody = {
            binary: mediaBinary,
            length: mediaBuffer.byteLength,
            bitrate: mediaBitrate,
            size: mediaSize
        };

        if (fileReady) {
            xlog.info("remove %s", filePath);
            fs.unlinkSync(filePath);
        }

        info.media = mediaBody;

        return info;
    }
    audio() {
        this.type = "audio";

        return new ProcessAudio(this);
    }
    video() {
        this.type = "video";

        return new ProcessVideo(this);
    }
}

module.exports = LintxMPDL;
