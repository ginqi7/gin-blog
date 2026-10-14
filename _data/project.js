export default function () {
  return {
    currentYear: new Date().getFullYear(),
    title: "Hello World",
    author: "Qiqi Jin",
    mail: "ginqi7@gmail.com",
    github: "https://github.com/ginqi7",
    indexPostSize: 5,
    baseURL: "/",
    // Feed 规范要求绝对 URL，只有域名是站点自己知道的，模板里推不出来，所以放在这里。
    // baseURL 保持 "/"（那是 <base> 的路径前缀，跟域名是两回事），别把两者合并。
    siteURL: "https://ginqi7.com/",
  };
}
