import * as cheerio from "cheerio";

function getFirstNParagraphs(html, n) {
  const $ = cheerio.load(html);
  const pTags = $("p").slice(0, n);
  const result = [];
  pTags.each((index, element) => {
    result.push($(element).text());
  });

  return result;
}

export default function (eleventyConfig) {
  eleventyConfig.addFilter("abstract", (data) => getFirstNParagraphs(data, 1));
}
