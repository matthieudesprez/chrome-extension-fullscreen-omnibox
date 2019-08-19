import HistoryItem = chrome.history.HistoryItem;
import BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode;

interface UserItem {
  title: string;
  url: string;
}

const flattenTreeNode = (treeNode: BookmarkTreeNode): BookmarkTreeNode[] =>
  treeNode.children ? [].concat(...treeNode.children.map(flattenTreeNode)) : [treeNode];
const removeDuplicate = (list: UserItem[]) =>
  list.reduce(
    (unique: any[], item: UserItem) => (unique.some(i => i.title === item.title) ? unique : [...unique, item]),
    []
  );

const debug = msg => (document.querySelector('#debug').innerHTML = msg);
const isUrl = str => /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/.test(str);

const getDomainUserItem = url => {
  let result;
  try {
    const hostname = new URL(url).hostname;
    result = {
      title: hostname,
      url: hostname
    };
  } catch (e) {
    console.log(e);
  }
  return result;
};

let historyList: UserItem[] = [];
let bookmarkList: UserItem[] = [];
let domainList: UserItem[] = [];
chrome.bookmarks.getTree((bookmarkTreeNodeList: BookmarkTreeNode[]) => {
  bookmarkList = [].concat(...bookmarkTreeNodeList.map(flattenTreeNode)) as UserItem[];
  domainList = domainList.concat(...bookmarkList.map(({ url }) => getDomainUserItem(url)));
});
chrome.history.search({ text: '', maxResults: 99999, startTime: 0 }, historyItems => {
  historyList = removeDuplicate(historyItems as UserItem[]);
  domainList = domainList.concat(...bookmarkList.map(({ url }) => getDomainUserItem(url)));
});

const input = document.querySelector<HTMLInputElement>('input[type=text]');
const inputImg = document.querySelector<HTMLInputElement>('#input-img');
inputImg.onerror = function() {
  this.src = `https://www.google.com/favicon.ico`;
};
const inputHidden = document.querySelector<HTMLInputElement>('input[type=hidden]');
const autocompleteList = document.querySelector('#autocomplete-list');
let currentActiveIndex = 0;

const updateActiveIndex = newIndex => {
  currentActiveIndex =
    newIndex < 0
      ? 0
      : newIndex > document.querySelectorAll('.autocomplete-item').length - 1
      ? document.querySelectorAll('.autocomplete-item').length - 1
      : newIndex;
};

const createItem = (historyItem: UserItem, displaySuffix = true): HTMLDivElement => {
  const item = document.createElement('DIV') as HTMLDivElement;
  let hostName = '';
  try {
    hostName = new URL(historyItem.url).hostname;
  } catch (e) {
    console.log(e);
  }
  const img = document.createElement('IMG') as HTMLImageElement;
  img.src = `https://${hostName}/favicon.ico`;
  img.height = 16;
  img.onerror = function() {
    this.style.display = 'none';
  };
  const span = document.createElement('SPAN') as HTMLSpanElement;
  span.innerHTML = historyItem.title.replace(
    new RegExp(input.value, 'gi'),
    substring => `<strong>${substring}</strong>`
  );
  if (displaySuffix) {
    span.innerHTML +=
      ' - ' + historyItem.url.replace(new RegExp(input.value, 'gi'), substring => `<strong>${substring}</strong>`);
  }

  item.appendChild(img);
  item.appendChild(span);
  item.setAttribute('class', 'autocomplete-item');
  item.setAttribute('aria-title', historyItem.title.replace(' - Google Search', ''));
  item.setAttribute('aria-url', historyItem.url);
  item.setAttribute('aria-favicon-url', img.src);
  item.addEventListener('click', () => {
    input.value = historyItem.title;
    inputHidden.value = historyItem.url;
    closeList();
  });
  return item;
};

const closeList = () =>
  document.querySelectorAll('.autocomplete-item').forEach(item => item.parentNode.removeChild(item));
const clearActive = () =>
  document.querySelectorAll('.autocomplete-active').forEach(item => item.classList.remove('autocomplete-active'));
const setActive = index => {
  clearActive();
  if (index >= 0) {
    const item = document.getElementsByClassName('autocomplete-item')[index];
    item.classList.add('autocomplete-active');
    input.value = item.getAttribute('aria-title');
    inputImg.src = item.getAttribute('aria-favicon-url');
    inputHidden.value = item.getAttribute('aria-url');
  }
};

input.addEventListener('keyup', e => {
  if (e.keyCode == 40) {
    updateActiveIndex(currentActiveIndex + 1);
    setActive(currentActiveIndex);
  } else if (e.keyCode == 38) {
    updateActiveIndex(currentActiveIndex - 1);
    setActive(currentActiveIndex);
  } else if (e.keyCode === 13) {
    const url = isUrl(input.value)
      ? input.value
      : isUrl(inputHidden.value)
      ? inputHidden.value
      : `https://www.google.com/search?q=${input.value.replace(/ /g, '+')}`;
    chrome.tabs.update({ url });
    window.close();
  }
});

input.addEventListener('input', () => {
  closeList();
  inputImg.src = `https://www.google.com/favicon.ico`;
  inputHidden.value = '';
  updateActiveIndex(0);
  autocompleteList.appendChild(
    createItem(
      {
        title: `${input.value} - Google Search`,
        url: `https://www.google.com/search?q=${input.value.replace(/ /g, '+')}`
      } as UserItem,
      false
    )
  );

  if (input.value.trim() !== '') {
    const matchList = [...domainList, ...historyList, ...bookmarkList].filter(
      (item: UserItem) =>
        item.title.toLowerCase().includes(input.value.toLowerCase()) ||
        item.url.toLowerCase().includes(input.value.toLowerCase())
    );
    matchList.slice(0, 14).forEach((item: UserItem) => autocompleteList.appendChild(createItem(item)));
  }
});

input.focus();
