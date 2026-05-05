import createDOMPurify from 'dompurify';
import { parseHTML } from 'linkedom';

// Cloudflare Workers에는 jsdom이 없으므로 linkedom의 가벼운 Window를 주입한다.
// isomorphic-dompurify는 jsdom 의존이라 Workers에서 sanitize가 undefined가 된다.
const { window } = parseHTML('<!doctype html><html><body></body></html>');

// dompurify의 factory 시그니처는 Window를 받는다. 타입은 Window와 호환되지 않지만
// linkedom Window는 querySelector/createElement 등 필요한 API를 갖추고 있다.
export const DOMPurify = createDOMPurify(window as unknown as Window & typeof globalThis);
