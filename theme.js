// Material 3 색상 토큰 (초록 계열 시드 색 기반). 대시보드와 잠금 화면이 같이 씁니다.
export const M3_TOKENS = `
  :root {
    color-scheme: light dark;
    --primary: #23694b; --on-primary: #ffffff;
    --primary-container: #aaf2ca; --on-primary-container: #002113;
    --secondary-container: #cfe9d9; --on-secondary-container: #0b1f15;
    --surface: #f6fbf5; --on-surface: #171d19; --on-surface-variant: #404943;
    --surface-container-low: #f0f5ef; --surface-container: #eaefea; --surface-container-high: #e4eae4;
    --outline: #707973; --outline-variant: #c0c9c1;
    --error: #ba1a1a; --on-error: #ffffff; --error-container: #ffdad6; --on-error-container: #410002;
    --warn-container: #ffddb3; --on-warn-container: #291800;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --primary: #8ed5ae; --on-primary: #00391f;
      --primary-container: #005234; --on-primary-container: #aaf2ca;
      --secondary-container: #344b3e; --on-secondary-container: #cfe9d9;
      --surface: #0f1511; --on-surface: #dee4de; --on-surface-variant: #c0c9c1;
      --surface-container-low: #171d19; --surface-container: #1b211d; --surface-container-high: #262b27;
      --outline: #8a938c; --outline-variant: #404943;
      --error: #ffb4ab; --on-error: #690005; --error-container: #93000a; --on-error-container: #ffdad6;
      --warn-container: #5e4200; --on-warn-container: #ffddb3;
    }
  }
`;
