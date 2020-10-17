import BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode;
import { fromEvent, merge } from 'rxjs';
import { distinctUntilChanged, filter, map, startWith } from 'rxjs/operators';

export interface ItemData {
  title: string;
  url: string;
}

export const flattenTreeNode = (treeNode: BookmarkTreeNode): BookmarkTreeNode[] =>
  treeNode.children ? [].concat(...treeNode.children.map(flattenTreeNode)) : [treeNode];

export const getImgSrc = (url: string): string => {
  let hostName = '';
  try {
    hostName = new URL(url).hostname;
  } catch (e) {
    console.log(e);
  }
  return `https://www.google.com/s2/favicons?domain=${hostName}`;
};

export const highlight = (text, search) =>
  text.replace(new RegExp(search, 'gi'), substr => `<strong>${substr}</strong>`);

export const keyArrowDownDown$ = fromEvent(document, 'keydown').pipe(filter((e: KeyboardEvent) => e.keyCode === 40));
export const keyArrowUpDown$ = fromEvent(document, 'keydown').pipe(filter((e: KeyboardEvent) => e.keyCode === 38));
export const keyEnterDown$ = fromEvent(document, 'keydown').pipe(filter((e: KeyboardEvent) => e.keyCode === 13));
export const ctrlKeyDown$ = merge(fromEvent(document, 'keyup'), fromEvent(document, 'keydown')).pipe(
  filter(({ key }: KeyboardEvent) => key === 'Control'),
  map(({ ctrlKey }: KeyboardEvent) => !!ctrlKey),
  distinctUntilChanged(),
  startWith(false)
);

export const removeDuplicate = (list: ItemData[]) =>
  list.reduce(
    (unique: any[], item: ItemData) => (unique.some(i => i.title === item.title) ? unique : [...unique, item]),
    []
  );

export const isUrl = str =>
  /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/.test(str);

export const getDomainUserItem = url => {
  let result;
  try {
    const { hostname, origin } = new URL(url);
    result = {
      title: hostname,
      url: origin
    };
  } catch (e) {
    console.log(e);
  }
  return result;
};
