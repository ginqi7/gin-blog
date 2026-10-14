import fs from "fs";
import util from "util";
import nodePandoc from "node-pandoc";

const pandocAsync = util.promisify(nodePandoc);

// pandoc 把 org 的 `*` 直接输出成 <h1>、`**` 成 <h2>……
// 可文章模板自己已经渲染了一个 <h1 class="title">，于是正文里的每个小节都跟页面标题
// 同级：Emacs Packages 那篇正文有 96 个 <h1>，MacOS 软件 13 个，Image Slicing 10 个。
// 文档大纲是平的，配上 base.css 的字号阶梯，每个小节都是 30.6px 的大标题。
// 这里把正文标题整体下移一级（h1→h2 … h5→h6），让每页只剩页面标题那一个 h1。
// 代码块里的 `<h1` 早被 pandoc 转义成 &lt;h1，不会被这条正则误伤。
function demoteHeadings(html) {
  return html.replace(
    /<(\/?)h([1-5])\b/g,
    (_, slash, level) => `<${slash}h${Number(level) + 1}`,
  );
}

function addOrgFormat(eleventyConfig) {
  eleventyConfig.addTemplateFormats("org");
  eleventyConfig.addExtension("org", {
    compile: async (inputContent, inputPath) => {
      const output = await pandocAsync(inputContent, "-f org -t html");
      const demoted = demoteHeadings(output);
      return async () => {
        return demoted;
      };
    },
    getData: true,
    getInstanceFromInputPath: async (inputPath) => {
      let data = {};
      fs.readFileSync(inputPath, "utf-8")
        .split(/\r?\n/)
        .forEach((line) => {
          let match = /^#\+(.*)$/.exec(line);
          if (match) {
            // console.log(match[1]);
            const items = match[1]
              .split(":")
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            // console.log(items);
            if (items.length < 2) {
              return;
            }
            let key = items[0].toLowerCase(),
              val = items.length == 2 ? items[1] : items.slice(1);
            if (key == "date") {
              data["date"] = val.split(" ")[0].replace(/<|>/g, "");
            } else if (key == "filetags") {
              data["tags"] = val;
            } else if (key == "export_file_name") {
              data["permalink"] = val+"/";
            } else {
              data[key] = val;
            }
          }
        });
      return { data: data };
    },
  });
}

export default function (eleventyConfig) {
  addOrgFormat(eleventyConfig);
}
