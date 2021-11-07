---
title: "Long Live Pi"
date: "2021-11-07T14:39:19.179+09:00"
description: "眠っていたRaspberry Piを再利用する方法について"
---

いつ頃購入したかは定かではないのですが、Raspberry Pi(以下raspi)の初代と3Bを所持していました。
これとは別に自宅サーバを何台か動かしているのですが、突発的にraspiを動かしたくなりました。
raspi 3Bはまだしもさすがに初代をこのご時世に使うのは非常に厳しいものがあります。

    $ ssh pi-1 lscpu
    Architecture:        armv6l
    Byte Order:          Little Endian
    CPU(s):              1
    On-line CPU(s) list: 0
    Thread(s) per core:  1
    Core(s) per socket:  1
    Socket(s):           1
    Vendor ID:           ARM
    Model:               7
    Model name:          ARM1176
    Stepping:            r0p7
    CPU max MHz:         700.0000
    CPU min MHz:         700.0000
    BogoMIPS:            697.95
    Flags:               half thumb fastmult vfp edsp java tls

完全にシングルスレッドでCPUの周波数も700MHzしかありません。
それでもこのブレッドボードが販売されたときはブラウザが動かせるのがウリでした。
初代のraspiをどう使おうか考えた結果、センサの類はいずれ試すとしてとりあえずスクレイピングでもしておこうかと思いました。

最初はAxiosとJSDOMの組み合わせを考えていたのですが、スクレイピングをしようと思ったサイトはJavaScriptがないと動かない様子。
というわけでPuppeteerとRaspbianをインストールしたときに使えるChromiumブラウザを使うことにしました。
幸いAnsibleとかはすぐ使えちゃうようなので、以下のタスクでサクッと必要なパッケージをインストールしてみます。(このタスク自体はサクッと書けたのですが、インストールが完了するまではしばし辛抱が必要です)

```yaml
---
- name: Install packages
  apt:
    name: "{{ item }}"
    state: present
  with_items:
    - git
    - nodejs
    - npm
    - node-sqlite3
    - chromium-browser
    - fonts-ipafont-mincho
    - fonts-ipafont-gothic
```

ここでのポイントはまずnvmなどのようなバージョン管理ツールを使うのは現実的ではありません。
少なくとも私の場合は一度のビルドに時間がかかりすぎるうえビルド中にクラッシュしてしまいデバッグしようという気持ちにもなりませんでした。

    $ ssh pi-1 node -v
    v10.24.0
    $ ssh pi-1 npm -v
    5.8.0

Raspbianが提供しているNode.jsは2021年11月の時点で`10.24.0`なのでBabelを使わなくてもよいし、Promiseも使えるし、Puppeteerのインストールも弾かれるわけでもなく、そんなに古いわけでもありません。
ただし、npmのほうは少々厳しいですね。
インストールができればよいくらいのスタンスでそれ以外は期待しないほうがよいと思います。
node-sqlite3も後ほど使う予定なのですが、とりあえずこれを入れておけば`node install`したときにビルドに失敗したりSQLが実行できないということはなくなるはず。
Chromiumをインストールするだけだと、日本語が表示できないのでIPAのフォントをインストールしておくとよいです。

```javascript
const puppeteer = require("puppeteer");
const option = process.env.NODE_ENV === "production"
  ? {
      product: "chrome",
      executablePath: "/usr/bin/chromium-browser",
    }
  : {};
const browser = await puppeteer.launch(option);
const page = await browser.newPage();

page.setDefaultNavigationTimeout(300000);
page.setDefaultTimeout(300000);
```

つづいてPuppeteerの書き方について。
システムにインストールされているChromiumブラウザを使いたいので`puppeteer-core`を選ぼうと思ったんですが、開発環境ではChromiumをいちいちインストールするのも面倒なので`puppeteer`を指定しています。
`npm install`するとき環境変数で`PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1`を指定しないと時間を無駄にするので気をつけましょう。
そして`NODE_ENV`でターゲットのraspiの環境で`executablePath`を指定してあげるようにします。
`setDefaultNavigationTimeout`と`setDefaultTimeout`にデフォルトの30秒だと**短すぎるので**タイムアウトを300秒に指定します。
これは単純にCPUがボトルネックになっているため、昨今のようなJavaScriptを多用しているようなサイトだとまず間違いなく処理しきれないためです。

![天気の画像](forecastCity-20211107_0541.png)

これがRaspberry Piで上記のコードを用いてスクレイピングした画像の一部です。
普段そこまで天気を気にすることはないのですが、雨が降りそうなときは予めアラート飛ばすくらいはできそうです。

raspi 3bは何に使うかというと、こちらはリソースに余裕があるため[Pi-hole][pi-hole]をインストールして運用することにしました。

これは何か簡単に説明すると、raspiで**好ましくないサイトやドメインをブロックする**ことができます。
最も身近な例で言えばGoogle Analyticsのデータ収集を防ぎたいと思うと、本来であればPCごとにあるhostsファイルを編集します。
最近では[hosts][hosts]というようなプロジェクトもあるのですが、例えばiOSやAndroidでは編集できませんし、PCをクリーンインストールするたびにこのセットアップをするのも面倒です。
Pi-holeがインストールされているraspiをネームサーバーに指定すれば問題が解決するというわけ。

    curl -sSL https://install.pi-hole.net | bash

インストールしたばかりの状態であれば特に問題なくpi-holeのインストールスクリプトで多少時間はかかるものの問題なくインストールできました。
デフォルトでさきほど紹介したhostsが指定されているようなのでこれでも充分といえば充分です。
追加で[https://firebog.net/](https://firebog.net/)と[https://dbl.oisd.nl](https://dbl.oisd.nl)をブロックリストに追加しておきました。

    curl https://analytics.google.com/
    curl: (7) Failed to connect to analytics.google.com port 443: Connection refused

あとは`curl`なりブラウザなりでGoogle Analyticsに**アクセスできない**ことがわかればセットアップは成功です。
もともと初代raspiもdnsmasqなんかを使って簡易的なDNSサーバとして使っていたことを思い出しましたが、Pi-holeにも同様の機能はありそうなのでモバイルの開発もはかどりそうです。
raspi 3bはポート80をpi-holeに渡してしまいましたが、リソース的に余裕があればSambaなどもセットアップしたいと思ってます。

結局フィジカルコンピューティングをしたくて購入したはずが、Linuxしかやることがなくて使いみちを失ってしまいがちなraspiたちでしたが、センサの類を使わなくてもまだまだ工夫のしがいはありそうです。

[pi-hole]: https://github.com/pi-hole/pi-hole
[hosts]:   https://github.com/StevenBlack/hosts
