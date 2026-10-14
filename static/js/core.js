const tags = [];

function getAllTags(item) {
  const inputs = item.querySelectorAll('input[type="checkbox"]');
  return Array.from(inputs).map((input) => input.value);
}

function filterPost(tags) {
  const items = document.querySelectorAll(".page-item");
  if (tags.length == 0) {
    items.forEach((item) => item.classList.remove("hidden"));
    return;
  }
  items.forEach(function (item) {
    const hasTags = getAllTags(item);
    const isIntersecting = tags.some((tag) => hasTags.includes(tag));
    if (isIntersecting) {
      item.classList.remove("hidden");
    } else {
      item.classList.add("hidden");
    }
  });
}

const checkboxes = document.querySelectorAll('input[type="checkbox"]');
checkboxes.forEach(function (checkbox) {
  checkbox.addEventListener("click", function (event) {
    const sameCheckboxes = document.querySelectorAll(
      `input[value="${this.value}"]`,
    );
    const checked = this.checked;
    sameCheckboxes.forEach((box) => (box.checked = checked));
    if (this.checked) {
      tags.push(this.value);
    } else {
      const index = tags.indexOf(this.value);
      if (index > -1) {
        tags.splice(index, 1);
      }
    }

    filterPost(tags);
  });
});

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const tag = urlParams.get("tag");
if (tag) {
  const cbs = document.querySelectorAll(`input[value="${tag}"]`);
  cbs.forEach((box) => (box.checked = true));
  filterPost([tag]);
}

/* ------------------------------------------------------------------
   代码块：复制按钮 / 折叠渐隐
   ------------------------------------------------------------------
   左上角的语言标签仍是纯 CSS（见 code.css 的 pre::before），这里只补两样
   非得有真实 DOM 不可的东西：

   1. 复制按钮。原来它是 <pre>::after 伪元素，伪元素收不到点击事件，所以那个
      "Copy" 一直点不动。真实 <button> 挂在 div.sourceCode 上而不是 <pre> 里：
      <pre> 是滚动容器（折叠/展开那套），绝对定位的子节点会跟着内容一起滚走。
      pandoc 对 text / example / elisp 这类它不认识的语言不套 wrapper，直接给
      <pre class="text">，所以这里顺手补一层，让所有代码块共用同一个定位基准。

   2. 底部渐隐。只有内容真被 max-height 裁掉时才加 .is-clipped，免得短代码块
      底下也糊一层白。
------------------------------------------------------------------ */

const COPY_RESET_MS = 1500;

// 复制成功/失败后在按钮上显示一下结果再恢复
function flashCopyResult(button, message, className) {
  clearTimeout(button.copyTimer);
  button.textContent = message;
  button.classList.add(className);
  button.copyTimer = setTimeout(() => {
    button.textContent = "Copy";
    button.classList.remove(className);
  }, COPY_RESET_MS);
}

function fallbackCopyText(text) {
  // navigator.clipboard 在非安全上下文（比如局域网 IP 上预览）不可用
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  // 不能 display:none 或 visibility:hidden，那样选不中
  ta.style.position = "fixed";
  ta.style.top = "-1000px";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (err) {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard
      .writeText(text)
      .then(
        () => true,
        () => fallbackCopyText(text),
      );
  }
  return Promise.resolve(fallbackCopyText(text));
}

// clientHeight 和 scrollHeight 都含 padding，所以能直接比。
function isOverflowing(pre) {
  return pre.scrollHeight > pre.clientHeight + 1;
}

const codeBlocks = [];

function refreshClippedBlocks() {
  codeBlocks.forEach((pre) => {
    pre.classList.toggle("is-clipped", isOverflowing(pre));
  });
}

document.querySelectorAll("pre").forEach((pre) => {
  if (pre.dataset.codeReady || !pre.parentNode) {
    return; // 同一个页面 core.js 可能被加载两次（archive 页），别重复注入
  }
  pre.dataset.codeReady = "1";

  // 补 wrapper：pandoc 只给它认得能高亮的语言套 div.sourceCode
  let host = pre.parentElement;
  if (!host || !host.classList.contains("sourceCode")) {
    host = document.createElement("div");
    host.className = "sourceCode";
    pre.parentNode.insertBefore(host, pre);
    host.appendChild(pre);
  }

  const fade = document.createElement("div");
  fade.className = "code-fade";
  host.appendChild(fade);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "code-copy";
  button.textContent = "Copy";
  button.addEventListener("click", () => {
    const code = pre.querySelector("code");
    copyText((code || pre).textContent).then((ok) => {
      flashCopyResult(
        button,
        ok ? "Copied" : "Failed",
        ok ? "is-done" : "is-failed",
      );
    });
  });
  host.appendChild(button);

  // 悬停时 <pre> 正展开着，此刻量到的 clientHeight 是展开后的高度，判断会失真；
  // 等折叠动画放完再量。
  pre.addEventListener("transitionend", (event) => {
    if (event.propertyName === "max-height") {
      refreshClippedBlocks();
    }
  });

  codeBlocks.push(pre);
});

refreshClippedBlocks();

// 窗口宽度一变，折行跟着变，是否需要折叠也就变了
let clipResizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(clipResizeTimer);
  clipResizeTimer = setTimeout(refreshClippedBlocks, 200);
});
