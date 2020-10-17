import { bindCallback, combineLatest, defer, from, fromEvent, iif, merge, Observable, of, Subject } from 'rxjs';
import { debounceTime, filter, map, mapTo, scan, switchMap, take, tap, toArray, withLatestFrom } from 'rxjs/operators';
import {
  ctrlKeyDown$,
  flattenTreeNode,
  getDomainUserItem,
  getImgSrc,
  highlight,
  isUrl,
  ItemData,
  keyArrowDownDown$,
  keyArrowUpDown$,
  keyEnterDown$,
  removeDuplicate
} from './utils';

// DATA
const historyList$ = bindCallback(chrome.history.search)({ text: '', maxResults: 6000, startTime: 0 }).pipe(
  map(list => removeDuplicate(list as ItemData[]))
);
const domainList$ = historyList$.pipe(map(list => removeDuplicate(list.map(({ url }) => getDomainUserItem(url)))));
const bookmarkList$ = bindCallback(chrome.bookmarks.getTree)().pipe(
  map(bookmarkTreeNodeList => [].concat(...bookmarkTreeNodeList.map(flattenTreeNode)) as ItemData[])
);

// INPUT COMPONENT
const input = document.querySelector<HTMLInputElement>('input[type=text]');
chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
  if (tabs.length && tabs[0].url !== 'chrome://newtab/') {
    input.value = tabs[0].url;
    input.select();
  }
});
const inputImg = document.querySelector<HTMLInputElement>('#input-img');
inputImg.onerror = function() {
  this.src = `https://www.google.com/favicon.ico`;
};
inputImg.onloadstart = function() {
  inputImg.style.display = 'inline-block';
};

// SUGGESTION LIST COMPONENT
const itemList = [];
document.querySelectorAll('.autocomplete-item').forEach(item => itemList.push(item));
const itemMaxLength = itemList.length;
const formatActiveIndex = (index, maxBoundary) => (index < 0 ? -1 : index >= maxBoundary ? maxBoundary - 1 : index);
const getSpanContent = (item: ItemData): string =>
  highlight(item.title, input.value) + (item.title ? ' - ' : '') + highlight(item.url, input.value);
const updateItemData = (data: ItemData, index): void => {
  let item = itemList[index];
  item.querySelector('img').src = getImgSrc(data.url);
  item.querySelector('img').onload = item.querySelector('img').onerror = () => {
    item.querySelector('span').innerHTML = getSpanContent(data);
    item.setAttribute('aria-favicon-url', getImgSrc(data.url));
    item.setAttribute('aria-title', data.title);
    item.setAttribute('aria-url', data.url);
    item.addEventListener('click', () => clickedItemData$.next(data.url));
    item['style'].display = 'block';
  };
};
const closeList = startIndex =>
  itemList.slice(startIndex, itemMaxLength).forEach(item => (item['style'].display = 'none'));
const clearActive = () => {
  inputImg.src = 'https://www.google.com/favicon.ico';
  document.querySelectorAll('.autocomplete-active').forEach(item => item.classList.remove('autocomplete-active'));
};

const clickedItemData$ = new Subject();
const inputValue$: Observable<string> = fromEvent(input, 'input').pipe(map(({ srcElement }) => srcElement['value']));

// COMBINE INPUT AND DATA
const userItemDataList$: Observable<ItemData[]> = combineLatest([
  inputValue$,
  domainList$,
  historyList$,
  bookmarkList$
]).pipe(
  switchMap(([value, domainList, historyList, bookmarkList]) =>
    iif(
      () => value.trim() !== '',
      defer(() =>
        from([...domainList, ...historyList, ...bookmarkList]).pipe(
          filter(
            (item: ItemData) =>
              item.title.toLowerCase().includes(value.toLowerCase()) ||
              item.url.toLowerCase().includes(value.toLowerCase())
          ),
          take(itemMaxLength - 1),
          toArray(),
          map(list => [
            {
              title: `${input.value} - Google Search`,
              url: `https://www.google.com/search?q=${input.value.replace(/ /g, '+')}`
            } as ItemData,
            ...list
          ])
        )
      ),
      of([])
    )
  )
);

userItemDataList$
  .pipe(
    debounceTime(0), // wait for index reset
    tap(userItemDataList => closeList(userItemDataList)),
    switchMap(userItemDataList =>
      from(userItemDataList).pipe(map((item: ItemData, index) => updateItemData(item, index)))
    )
  )
  .subscribe();

let activeUrl = null;

const setActive = index => {
  clearActive();
  if (index >= 0) {
    const item = document.getElementsByClassName('autocomplete-item')[index];
    item.classList.add('autocomplete-active');
    input.value = item.getAttribute('aria-url');
    inputImg.src = item.getAttribute('aria-favicon-url');
    activeUrl = item.getAttribute('aria-url');
  }
};

const navigate = (value, ctrlKeyDown) => {
  const url = isUrl(value)
    ? value
    : isUrl(activeUrl)
    ? activeUrl
    : `https://www.google.com/search?q=${input.value.replace(/ /g, '+')}`;
  if (ctrlKeyDown) {
    chrome.tabs.create({ url });
  } else {
    chrome.tabs.update({ url });
  }
  window.close();
};

const selectedIndex$ = merge(
  keyArrowDownDown$.pipe(mapTo(1)),
  keyArrowUpDown$.pipe(mapTo(-1)),
  inputValue$.pipe(mapTo(-1 * itemMaxLength))
).pipe(
  scan(
    (acc, curr) =>
      formatActiveIndex(acc + curr, document.querySelectorAll('.autocomplete-item[style*="display: block"]').length),
    -1
  )
);

const selectedUrl$ = selectedIndex$.pipe(tap(setActive));

merge(
  keyEnterDown$.pipe(
    withLatestFrom(selectedUrl$),
    map(([, url]) => url)
  ),
  clickedItemData$
)
  .pipe(
    withLatestFrom(ctrlKeyDown$),
    tap(([url, ctrlKeyDown]) => navigate(url, ctrlKeyDown))
  )
  .subscribe();

input.focus();
