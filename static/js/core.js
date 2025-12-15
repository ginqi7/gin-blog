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
    const isIntersecting = tags.some((item) => hasTags.includes(item));
    console.log(isIntersecting);
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
    console.log(sameCheckboxes);
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
