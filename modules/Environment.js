import Bottleneck from "bottleneck";

import Filepaths from "./Filepaths";

import Settings from "./persistence/Settings";

import DetectPython from "./DetectPython";

import Logger from "./persistence/Logger";

import {promises as fs} from "fs";

class Environment {
    constructor(app) {
        this.app = app;
        this.version = app.getVersion();
        this.cookiePath = null;
        this.mainAudioOnly = false;
        this.mainVideoOnly = false;
        this.mainAudioQuality = "best";
        this.mainDownloadSubs = false;
        this.doneAction = "Do nothing";
        this.logger = new Logger(this);
        this.paths = new Filepaths(app, this);
        this.downloadLimiter = new Bottleneck({
            trackDoneStatus: true,
            maxConcurrent: 4,
            minTime: 0
        })
        this.metadataLimiter = new Bottleneck({
            trackDoneStatus: true,
            maxConcurrent: 4,
            minTime: 0
        })
    }

    //Read the settings and start required services
    async initialize() {
        await this.paths.generateFilepaths();
        this.settings = await Settings.loadFromFile(this.paths, this);
        this.changeMaxConcurrent(this.settings.maxConcurrent);
        if(this.settings.cookiePath != null) { //If the file does not exist anymore, null the value and save.
            fs.access(this.settings.cookiePath).catch(() => {
                this.settings.cookiePath = null;
                this.settings.save();
            })
        }
        if(process.platform === "linux") {
            const pythonDetect = new DetectPython();
            this.pythonCommand = await pythonDetect.detect();
        } else {
            this.pythonCommand = "python";
        }
        await this.paths.validateDownloadPath();
    }

    changeMaxConcurrent(max) {
        const settings = {
            trackDoneStatus: true,
            maxConcurrent: max,
            minTime: 0
        }
        this.downloadLimiter.updateSettings(settings);
        this.metadataLimiter.updateSettings(settings);
    }
}

export default Environment;
