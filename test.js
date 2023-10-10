// const cp = require("child_process");
// const task = cp.exec("/home/lintxid/Archive/yt-dlp https://www.youtube.com/watch\?v\=RSWPTbP2uik -j", (err, stdout, stderr) => {
//     require("fs").writeFileSync("./tmp/meta.json", JSON.stringify(JSON.parse(stdout), null, 4));
// });

const LintxMPDL = require("./ytdlp");
const mpdl = new LintxMPDL("https://www.youtube.com/watch?v=6q4U6nTqVcw");

//mpdl.video().quality(144).resolve() //quality("64").format("mp4").full()

console.log(Buffer.from(btoa("test"), "ascii"));
