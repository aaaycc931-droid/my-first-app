package com.aaaycc931.solfeggio;

import com.getcapacitor.BridgeActivity;
import com.aaaycc931.solfeggio.midi.UsbMidiPlugin;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    registerPlugin(UsbMidiPlugin.class);
    super.onCreate(savedInstanceState);
  }

  @Override
  public void onPause() {
    dispatchLifecycle("pause");
    super.onPause();
  }

  @Override
  public void onResume() {
    super.onResume();
    dispatchLifecycle("resume");
  }

  private void dispatchLifecycle(String state) {
    if (getBridge() == null || getBridge().getWebView() == null) return;

    String script =
        "window.dispatchEvent(new CustomEvent('solfeggio:native-lifecycle',"
            + "{detail:{state:'"
            + state
            + "'}}));";
    getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript(script, null));
  }
}
