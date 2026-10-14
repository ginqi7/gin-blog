import fs from "fs";
import path from "path";
import Fontmin from "fontmin";

// 中文字体。源文件 jinkai.ttf 是 3.91 MB，直接发给浏览器不现实，所以按站点实际
// 用到的字符切出子集再上线（现在约 1340 个字 -> woff2 约 312 KB，小 12.5 倍）。
//
// 为什么放在构建时自动做、而不是像 Alegreya 那样用 scripts/subset-fonts.sh 手动跑：
// Alegreya 的字符范围是个设计决定（Basic Latin + Latin-1 + 标点），写多少篇文章都
// 不会变；jinkai 的范围完全取决于站上写了什么字。手动维护一定会忘，忘了的表现是
// 新文章里的字悄悄掉回系统字体，跟周围的中文不是一套字形——这种问题很难被注意到。
//
// 字符从 _site/**\/*.html 里取：静态 HTML 就是最终渲染结果，没有比它更准的来源，
// 模板里的日期、"See more posts"、上一篇/下一篇的标题全都算在里面。
// 不从 CSS/JS 里取——core.js 的非 ASCII 全在注释里（逐字符验证过，去掉注释后为 0），
// CSS 同理，取进去只会白带几百个永远不会渲染的字形。

const SOURCE_FONT = "static/fonts/zh/jinkai.ttf";
const OUTPUT_DIR = "_site/static/fonts/zh";
const OUTPUT_NAME = "jinkai.woff2";

function htmlFilesIn(dir) {
  const found = [];
  const walk = (current) => {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return; // 目录不存在（产物还没写出来）时当作空目录
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".html")) found.push(full);
    }
  };
  walk(dir);
  return found;
}

function usedCharacters(files) {
  const seen = new Set();
  for (const file of files) {
    for (const char of fs.readFileSync(file, "utf8")) seen.add(char);
  }
  return [...seen].join("");
}

function subsetWoff2(text) {
  return new Promise((resolve, reject) => {
    const fontmin = new Fontmin()
      .src(SOURCE_FONT)
      .use(Fontmin.glyph({ text }))
      // ttf2woff2 的原生模块没编译时它会自动退回 jssrc 里那份 Emscripten/WASM
      // 实现（node_modules/ttf2woff2/dist/index.js 的 try/catch），所以
      // Dockerfile 那个没有 python/make/g++ 的 node:24-alpine 也能跑得动。
      .use(Fontmin.ttf2woff2());

    fontmin.run((err, files) => {
      if (err) return reject(err);
      const woff2 = files.find((file) => file.path.endsWith(".woff2"));
      if (!woff2) return reject(new Error("fontmin 没产出 woff2"));
      resolve(woff2.contents);
    });
  });
}

export default function (eleventyConfig) {
  // 挂在 eleventy.after：所有页面都写完之后，_site 里的 HTML 才是最终内容。
  eleventyConfig.on("eleventy.after", async () => {
    try {
      const files = htmlFilesIn("_site");
      const text = usedCharacters(files);

      // 只有"产物是空的"才跳过。宁可这次不生成，也不要拿一个没有字形的字体
      // 覆盖掉上一次那个好的——浏览器缓存里那份还能用。
      if (files.length === 0 || text.length === 0) {
        console.warn("[subset-font] _site 里没有可用的 HTML，跳过切字");
        return;
      }

      const contents = await subsetWoff2(text);
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      fs.writeFileSync(path.join(OUTPUT_DIR, OUTPUT_NAME), contents);
      console.log(
        `[subset-font] ${text.length} 个字符 -> ${OUTPUT_NAME} ${(contents.length / 1024).toFixed(1)} KB`,
      );
    } catch (err) {
      // 切字失败时中文回退到系统字体，站点照常可用。绝不能因为字体把整个 build 弄挂。
      console.error(`[subset-font] 切字失败，中文将回退到系统字体：${err.message}`);
    }
  });
}
