---
title: "Expo AVで動画を再生する"
date: "2021-10-17T10:04:27.192+09:00"
description: "React Native (Expo)で動画再生するときのメモ"
---

これまではバックエンド側で動画ファイルを扱うことについて書いていましたが、今回はクライアント側で動画ファイルを再生してみようというわけ。
iMacも購入したしSwift UIをやるつもりでしたが今回はReact Nativeを使うことにしました。
Xcodeを起動したりiPhoneを接続しなくても手っ取り早く開発できるのは素晴らしいですね。

閑話休題ですが、React Nativeで動画ファイルを再生するときは`<video>`タグの代わりに[**Expo AV**](expo-av)が使えるようです。
SDKを使用するので`expo install expo-av`を実行します。
まずは以下のサンプルから試してみました。

```jsx
import * as React from 'react';
import { View } from 'react-native';
import { Video } from 'expo-av';

function VideoScreen({ videoUri }) {
  const video = React.useRef(null);

  return (
    <View>
      <Video
        ref={video}
        source={{
          uri: videoUri,
        }}
        useNativeControls
        resizeMode="contain"
        rate={1.0}
        volume={1.0}
        isMuted={false}
      />
    </View>
  );
}
```

繰り返しますがReact Nativeでの開発はExpoを使えばMacである必要すらなく、これは素晴らしいことです。
ただしビデオを再生できて喜ぶのもつかの間、すぐに音声が再生されないことに気づくでしょう。
上記のコードには`isMuted={false}`や`volume={1.0}`などの記述があるにも関わらず。

iPhoneの動画ファイルは通常サイレントモードで音声が出ないようになっています。
TwitterやImgurなどの埋め込み動画などを見ていると何故かサイレントモードなのにも関わらず音声が再生されるので、サイレントモードでも音声が出せるのが当たり前というのが不思議なところです。
とはいえわざわざサイレントモードのスイッチを切り替えるのも面倒なので以下のコードを追加します。

```jsx
import * as React from 'react';
import { View } from 'react-native';
import { Video, Audio } from 'expo-av';

function VideoScreen({ videoUri }) {
  const video = React.useRef(null);

  // https://github.com/expo/expo/issues/11246#issuecomment-743062535
  React.useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
  }, []);

  return (
    <View>
      <Video
        ref={video}
        source={{
          uri: videoUri,
        }}
        useNativeControls
        resizeMode="contain"
        rate={1.0}
        volume={1.0}
        isMuted={false}
      />
    </View>
  );
}
```

動画ファイルの再生なのに`Audio`というクラスが出てくるのも若干違和感がありますが、上記のコードでサイレントモードでも動画ファイルから音声が再生できるようになりました。
あとは使い勝手の面で言えば今回再生したい動画ファイルはほぼすべて**16:9**の動画ファイルなのでフルスクリーン時にランドスケープモードに変更できるのが好ましいです。
そんなときは[**ScreenOrientation**](screen-orientation)を使うようです。
こちらもあらかじめ`expo install expo-screen-orientation`を実行して、`app.json`を編集します。

```json
{
  "expo": {
    "ios": {
      "supportsTablet": true,
      "requireFullScreen": true
    }
  }
}
```

`ScreenOrientation.lockAsync`という関数が使えるのでフルスクリーン時に実行するようにします。
同じく`ScreenOrientation.unlockAsync`という関数が用意されているのですが、なぜかこちらが動作しなかったので*フルスクリーン時はランドスケープモードに固定し、解除したらポートレートモードに固定する*という挙動にしてみました。

```jsx
import * as React from 'react';
import { View } from 'react-native';
import { Video, Audio } from 'expo-av';

function VideoScreen({ videoUri }) {
  const video = React.useRef(null);

  // https://github.com/expo/expo/issues/11246#issuecomment-743062535
  React.useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
  }, []);

  return (
    <View>
      <Video
        ref={video}
        source={{
          uri: videoUri,
        }}
        useNativeControls
        resizeMode="contain"
        rate={1.0}
        volume={1.0}
        isMuted={false}
        onFullscreenUpdate={async ({ fullscreenUpdate }) => {
          // https://github.com/expo/expo/issues/6864#issuecomment-678620290
          switch (fullscreenUpdate) {
            case Video.FULLSCREEN_UPDATE_PLAYER_WILL_PRESENT:
              await lockAsync(OrientationLock.LANDSCAPE_RIGHT);
              break;
            case Video.FULLSCREEN_UPDATE_PLAYER_WILL_DISMISS:
              await lockAsync(OrientationLock.PORTRAIT_UP);
              break;
          }
        }}
      />
    </View>
  );
}
```

非常に簡潔なコードでそこそこ実用性のある動画プレイヤーが使えるようになりました。
理想としてはSwift UIでも似たようなものを作りたいものですが、案外React Nativeだけでも十分かもしれません。

[expo av]: https://docs.expo.dev/versions/latest/sdk/av/
[screen-orientation]: https://docs.expo.dev/versions/latest/sdk/screen-orientation/
