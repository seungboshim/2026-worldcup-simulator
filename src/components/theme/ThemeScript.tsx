// 서버 컴포넌트: 페인트 전에 .dark 클래스를 적용하는 no-flash 스크립트.
// (클라이언트 컴포넌트가 아니므로 React 19의 "script in component" 경고가 발생하지 않음)
const script = `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark')}}catch(e){}})();`

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} suppressHydrationWarning />
}
