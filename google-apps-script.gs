// 구글 Apps Script: 매일 아침 6~7시에 GitHub "도서관 대출 현황 갱신"을 실행합니다.
// GitHub 토큰은 이 코드에 적지 말고, 프로젝트 설정 > 스크립트 속성에 GITHUB_TOKEN 으로 넣으세요.

const REPO = 'y2k313-dev/jungmin';
const WORKFLOW = 'update.yml';

// 실제로 GitHub 실행 버튼을 누르는 함수 (시험 실행도 이걸로)
function runWorkflow() {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('스크립트 속성에 GITHUB_TOKEN 이 없어요.');

  const res = UrlFetchApp.fetch(
    'https://api.github.com/repos/' + REPO + '/actions/workflows/' + WORKFLOW + '/dispatches',
    {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer ' + token.trim(),
        'X-GitHub-Api-Version': '2022-11-28',
      },
      payload: JSON.stringify({ ref: 'main', inputs: { extend: 'true' } }),
      muteHttpExceptions: true,
    }
  );

  const code = res.getResponseCode();
  if (code === 204) {
    Logger.log('성공: GitHub 갱신을 시작했어요 (204)');
    return;
  }
  // 실패하면 오류로 끝내서 구글이 메일로 알려주게 합니다
  const hint = {
    401: '토큰이 틀렸어요. GITHUB_TOKEN 값을 다시 넣어 주세요.',
    403: '토큰 권한이 부족해요. Actions: Read and write 인지 확인하세요.',
    404: '저장소를 찾지 못했어요. 토큰에 jungmin 저장소를 선택했는지 확인하세요.',
    422: '요청 형식 오류예요.',
  }[code] || '';
  throw new Error('실패 (' + code + ') ' + hint + ' ' + res.getContentText().slice(0, 200));
}

// 매일 아침 6~7시 자동 실행 예약을 만드는 함수 (한 번만 실행하면 됨)
function setupDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'runWorkflow') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('runWorkflow')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .inTimezone('Asia/Seoul')
    .create();
  Logger.log('예약 완료: 매일 아침 6~7시 사이에 실행돼요');
}
