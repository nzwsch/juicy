---
title: NginxでMP4のモジュールを有効にする
date: "2021-09-19T14:59:51.510+09:00"
description: 簡易的なメディアサーバーを作るときのメモ
---

**TL;DR** alpine linuxを使えば解決。

最近はRailsで簡易的な動画ファイルをセルフホスティングできるアプリケーションを作っています。
有名所では**Plex**や、最近は**Jellyfin**などのようなアプリケーションもあります。
これらはiOSやAndroid向けや、ChromecaseやFireTVなどのクライアントにも対応していたりするのですが、動画を観るだけならブラウザで十分です。
しかし自宅で動画をホスティングしようとすると、数百MBや数GBはあるファイルを一度にダウンロードしようとするので動画ファイルをシークすることはできません。

そこで最初は動画をストリーミング再生する方法を調べようとしていて、Nginxには[**RTMP**](https://docs.nginx.com/nginx/admin-guide/dynamic-modules/rtmp/)というモジュールが存在しているようです。
このページにも記されているようにDebianやAlpineでもコマンドでインストールすることができるようです。
あとは`/etc/nginx/modules-enabled`に`50-mod-rtmp.conf`というファイルが作成されるのでこのモジュールを使うことができるようになるわけ。
RTMPはストリーミング配信するときに必要なもので今回の要件とはあまり関係ないようでした。

https://gist.github.com/CSRaghunandan/ce2394cd5a9c8a412f8ff5ee1478560a#file-nginx-conf-L106

たまたま似たようにNginx単体でMP4を配信できそうな`nginx.conf`のGistが見つかりました。
このファイルをそのまま使おうとすると:

    nginx: [emerg] unknown directive "mp4" in /etc/nginx/nginx.conf:32

`mp4`というディレクティブは存在しないとのこと。

https://nginx.org/en/docs/http/ngx_http_mp4_module.html

Nginxのドキュメントを探すと`ngx_http_mp4_module`というモジュールが存在しているようで、これを使うと上記の設定ファイルが動くようになるようです。
Nginxが使用できるモジュール一覧を調べるときのコマンドは[`nginx -V`](https://www.cyberciti.biz/faq/how-to-list-installed-nginx-modules-and-compiled-flags/)です。

```dockerfile
FROM debian:stable
RUN apt-get update && \
    apt-get install nginx libnginx-mod-rtmp -y
```

これを最初試そうとしていたときDebianのDockerfileで、コマンドの結果が以下のとおり。

    nginx -V | tr ' ' '\n' | grep mp4

出力結果は出ないため当然`mp4`というディレクティブは使えません。

[Nginx : Add/Enable mp4 module](https://serverfault.com/a/533493)

上記のSOでの回答によると`nginx-extras`のパッケージをインストールすれば良いとのことでした。
余談ですが、昔からNginxのチュートリアルを見ると`nginx-extras`をインストールするものが多かったのですが、最初から使えるモジュールが多かったんですね。

    nginx -V | tr ' ' '\n' | grep mp4
    --with-http_mp4_module

今度は使えるようになりました。
先程のGistを若干書き換えて試してみたところ、iPhoneのブラウザでも1GB以上はあるビデオファイルを閲覧できるようになりました。
といってもこれはもともとDebianのベースイメージなので、理想はNginxのDockerfileで使いたいところです。
そう思ってNginxのコンテナイメージを指定してみたところ:

    docker run -it nginx:alpine nginx -V | tr ' ' '\n' | grep mp4
    --with-http_mp4_module

ということでNginxのコンテナイメージはあらかじめMP4形式を指定できるようでした。
普段Railsを使っているだけだと意外と見過ごしがちなのですが、Nginxも結構奥が深いものだなと思った一日でした。
