import fs from "fs";
import util from "util";
import nodePandoc from "node-pandoc";

const pandocAsync = util.promisify(nodePandoc);

function addOrgFormat(eleventyConfig) {
  eleventyConfig.addTemplateFormats("org");
  eleventyConfig.addExtension("org", {
    compile: async (inputContent, inputPath) => {
      const output = await pandocAsync(inputContent, "-f org -t html");
      return async () => {
        return output;
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
              console.log(val);
              data["date"] = val.split(" ")[0].replace(/<|>/g, "");
            } else if (key == "filetags") {
              data["tags"] = val;
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
