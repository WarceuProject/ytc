const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const statuses = require("statuses");
const port = process.env.PORT || 2096;
const LintxMPDL = require("./ytdlp");
const morgan = require("morgan");
const cp = require("child_process");
const { log } = require("console");

function serviceAlready() {
    return cp.execSync(`ss -tulpn`).toString().trim().includes(`:${port}`);
}

// abort process when service already running
if (serviceAlready()) {
    console.log("\x1b[91mAddress http://0.0.0.0:%d already in use\x1b[0m", port);
    process.exit(0);
}

function sendResponse(contentType) {
    return {
        response: null,
        use(response) {
            !this.response && (this.response = response);

            return this;
        },
        status(statusCode) {
            if (!this.response) {
                throw Error("Undefined or missing Response {}");
            }

            !this.statusCode && (this.statusCode = statusCode);
            this.response.status(statusCode);

            return this;
        },
        content(anyContentResponse) {
            const statusCode = this.statusCode;
            const contentResponse = {
                status: this.statusCode,
                get statusText() {
                    return statuses.message[statusCode];
                },
                ...anyContentResponse
            };
            
            if (!this.response[this.contentType]) {
                throw Error("Property \"" + this.contentType + "\" does not exist on Response {}");
            }

            this.response[this.contentType](contentResponse);
        },
        ...{ contentType }
    }
}

// logger
app.use(morgan("dev"));

// parse body to json format
app.use(bodyParser.json());

// mp3 endpoint
app.get("/dl/mp3", async (req, res, next) => {
    const { url: yturl, ftype, quality, full } = (req.query || {});
    
    try {
        const info = new LintxMPDL(yturl).audio().format(ftype).quality(quality);
        const media = full === String(true) ? info.full() : info.short();

        res.json(await media);
    } catch (error) {
        return sendResponse("json")
            .use(res)
            .status(400)
            .content({
                message: error.message || error
            });
    }
});

// mp4 endpoint
app.get("/dl/mp4", async (req, res, next) => {
    const { url: yturl, ftype, quality, full } = (req.query || {});
    
    try {
        const info = new LintxMPDL(yturl).video().format(ftype).quality(quality);
        const media = full === String(true) ? info.full() : info.short();

        res.json(await media);
    } catch (error) {
        return sendResponse("json")
            .use(res)
            .status(400)
            .content({
                message: error.message || error
            });
    }
});

app.use((req, res, next) => {
    res.sendStatus(500);
});

app.listen(port, () => {
    console.log("\x1b[1;94mLintxMPdl\x1b[0m \x1b[90mrunning on\x1b[0m \x1b[93mhttp://0.0.0.0:%d\x1b[0m", port);
});
