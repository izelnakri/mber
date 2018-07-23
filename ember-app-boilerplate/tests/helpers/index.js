import {
  setupApplicationTest as upstreamSetupApplicationTest,
  setupRenderingTest as upstreamSetupRenderingTest,
  setupTest as upstreamSetupTest,
} from 'ember-qunit';

let setupTest = function(hooks) {
  clearBrowser();

  window.DISABLE_MEMSERVER = true;

  upstreamSetupTest(hooks);
}

let setupRenderingTest = function(hooks) {
  clearBrowser();

  window.DISABLE_MEMSERVER = true;

  upstreamSetupRenderingTest(hooks);
}

let setupApplicationTest = function(hooks) {
  clearBrowser();

  window.DISABLE_MEMSERVER = false;

  upstreamSetupApplicationTest(hooks);
}

export {
  setupApplicationTest,
  setupRenderingTest,
  setupTest
}

function clearBrowser() {
  document.getElementById('ember-testing-container').scrollTop = 0;
  document.cookie.split(";").forEach((cookie) => {
    document.cookie = cookie.replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });
  window.localStorage.clear();

  if (window.MemServer) {
    window.MemServer.shutdown();
  }
}
