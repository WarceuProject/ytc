const yts = require('yt-search');
const { default: axios } = require("axios");


class YTSearch {
    constructor(query) {
        this.query = query;

        if (!query) {
            throw Error('Missing query for search');
        }

        this.result = yts(query);
    }
    factoryMap(videos = [], type) {
        return videos.map(v => v[type]);
    }
    factoryFind(videos = [], type = '', val) {
        return videos.find(v => v[type] === val);
    }
    findMax(arr = []) {
        return Math.max.apply(this, arr);
    }
    findMin(arr = []) {
        return Math.min.apply(this, arr);
    }
    async getVideoList() {
        const videos = (await this.result).videos || [];

        if (!videos.length) {
            throw Error('Get 0 videos result');
        }

        return videos;
    }
    async getAudioList() {
        // not available yet
        return (await this.result).audios;
    }
    async getFirstVideo() {
        const videos = await this.getVideoList();
        const video = videos[1];

        return video;
    }
    async getLastVideo() {
        const videos = await this.getVideoList();
        const video = videos[videos.length - 1];

        return video;
    }
    async getVideoByMostViews() {
        const videos = await this.getVideoList();
        const viewsList = this.factoryMap(videos, 'views');
        const mostViews = this.findMax(viewsList);
        const video = this.factoryFind(videos, 'views', mostViews);

        return video;
    }
    async getVideoByLeastViews() {
        const videos = await this.getVideoList();
        const viewsList = this.factoryMap(videos, 'views');
        const leastViews = this.findMin(viewsList);
        const video = this.factoryFind(videos, 'views', leastViews);

        return video;
    }
    async getVideoByLongestDuration() {
        const videos = await this.getVideoList();
        const timestampList = this.factoryMap(videos, 'seconds');
        const longerDuration = this.findMax(timestampList);
        const video = this.factoryFind(videos, 'seconds', longerDuration);

        return video;
    }
    async getVideoByShortestDuration() {
        const videos = await this.getVideoList();
        const timestampList = this.factoryMap(videos, 'seconds');
        const shorterDuration = this.findMin(timestampList);
        const video = this.factoryFind(videos, 'seconds', shorterDuration);

        return video;
    }
    async getRandomVideo() {
        const videos = await this.getVideoList();
        const randIndex = Math.floor(Math.random() * videos.length);
        const video = videos[randIndex];

        return video;
    }
    async pickVideo(index) {
        const videos = await this.getVideoList();

        if (typeof index !== 'number' || index > videos.length || index < 0) {
            throw Error('Index must be a number between 0-' + videos.length);
        }

        const video = videos[index];

        return video;
    }
    async getVideoBy(category = '') {
        const categories = ['first', 'last', 'most', 'least', 'longest', 'shortest', 'random']
        let video = {};

        switch (category) {
            case categories[0]:
                video = await this.getFirstVideo();
                break;
            case categories[1]:
                video = await this.getLastVideo();
                break;
            case categories[2]:
                video = await this.getVideoByMostViews();
                break;
            case categories[3]:
                video = await this.getVideoByLeastViews();
                break;
            case categories[4]:
                video = await this.getVideoByLongestDuration();
                break;
            case categories[5]:
                video = await this.getVideoByShortestDuration();
                break
            case categories[6]:
                video = await this.getRandomVideo();
                break;
            default:
                throw Error('Categories must be value between ' + categories.join('|'));
                break;
        }

        return video;
    }
}
class MediaInfo {
    constructor() {
        Object.assign(this, arguments[0]);
    }
}
class LintxMP {
    constructor(opts = {}) {
        // this.url = opts.url;
        // this.ytId = opts.ytId;
        this.search = opts.search;
    }
    async getAudioInfo() {
        const audioInfo = new MediaInfo();
        const ytsearch = new YTSearch(this.search);
        const video = await ytsearch.getVideoBy('first');
        const info = await LintxMP.convertAudio(video.url);

        audioInfo.filesize = info.fsize;
        audioInfo.lintxThumb = video.thumbnail;
        audioInfo.buffer = info.buffer;
        // audioInfo.dlink = info.dlink;
        Object.assign(audioInfo, Object.fromEntries(Object.entries(video).filter(([k]) => !['image', 'duration', 'type'].includes(k))));
        
        return audioInfo;
    }
    static async getVideoList(query) {
        const ytsearch = new YTSearch(query);
        const videos = await ytsearch.getVideoList();

        return videos;
    }
    static async convertAudio(url) {
        const res = await axios("http://154.53.61.106:12096/dl/mp3", {
                params: {
                        url
                },
                responseType: "json"
        }).catch(e => {});
        
        if (!res.data) {
                throw Error("Failed getting info");
        }
        
        const buffer = this.base64ToBuffer(res.data.media);
        const fsize = res.data.fsize;
        
        return {
                buffer,
                fsize
        };
    }
    static async convertVideo(url) {
        const res = await axios("http://154.53.61.106:12096/dl/mp4", {
                params: {
                        url
                },
                responseType: "json"
        }).catch(e => {});
        
        if (!res.data) {
                throw Error("Failed getting info");
        }
        
        const buffer = this.base64ToBuffer(res.data.media);
        const fsize = res.data.fsize;
        
        return {
                buffer,
                fsize
        };
    }
    static async convertMedia(url) {
        return {
            audio: await this.convertAudio(url),
            video: await this.convertVideo(url)
        };
    }
    static base64ToBuffer(base64) {
        return Buffer.from(base64, 'base64');
    }
    static search = yts
}

module.exports = LintxMP;
