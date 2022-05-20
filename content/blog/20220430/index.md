---
title: "Dokkuを試す"
date: "2022-04-30T14:56:08.255+09:00"
description: "自前でHerokuを使うまでの方法"
---

最近はほとんど趣味でプログラムを書かなくなってしまったためモチベーションの維持に奔走中なのですが、自前のサーバーでHerokuのようなシステムを構築できるというDokkuを試してみることにしました。

### インストール

私はDebianのBullseyeを使うことにしました。
公式のドキュメントによると、UbuntuやCentOSも使えるようです。
バージョンは`0.27.1`を使うことにします。

    $ wget https://raw.githubusercontent.com/dokku/dokku/v0.27.1/bootstrap.sh
    $ sudo DOKKU_TAG=v0.27.1 bash bootstrap.sh

公式のドキュメントによるとこれだけなのですが、私の場合は(大量の警告が表示されるので)Localeの設定が必要みたいです。

[Locale](https://wiki.debian.org/Locale#SSH)より:

```
# サーバーの /etc/ssh/sshd_config
AcceptEnv LANG LC_*

# クライアントの /etc/ssh/ssh_config
SendEnv LANG LC_*
```

クライアントのターミナルでlocaleの設定がそのまま反映されるみたいなので、`.bashrc`に以下の記述をするのが一番早いです。

```
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
```

    $ perl -e exit

サーバー上でPerlを実行して警告がでなくなればOKです。

### SSHの設定

あとはリファレンスに沿ってアプリケーションを作成して、`git push dokku main:master`を実行してみると以下のエラーが表示されました。

```
fatal: 'ruby-getting-started' does not appear to be a git repository
fatal: Could not read from remote repository.

Please make sure you have the correct access rights
and the repository exists.
```

確かにアプリケーションは作成したはずと思って、次のコマンドで確認します:

    $ dokku apps:list
    =====> My Apps
    ruby-getting-started

確かに存在しています。

[Dokku - Docs - Getting Started - Troubleshooting](https://dokku.com/docs~v0.27.1/getting-started/troubleshooting/#i-want-to-deploy-my-app-but-i-am-getting-asked-for-the-password)

ここに記載されている方法の通りコンフィグを編集しました。

```
Host dokku
    Hostname <IPアドレス>
    User dokku
    Port 22
    IdentityFile "~/.ssh/id_rsa"
```

重要なのはdokkuに登録した秘密鍵を指定することと、ユーザーを`dokku`に指定することでした。
最近になって出てきたEdDSAとRSAの鍵がローカルにあったのですが、おそらく鍵の内容が一致していなかったのでしょう。
うまく設定できたか`git remote`コマンドで確認します。

    $ git remote add dokku dokku:ruby-getting-started
    $ git remote show dokku
    * remote dokku
      Fetch URL: dokku:ruby-getting-started
      Push  URL: dokku:ruby-getting-started
      HEAD branch: master
      Remote branch:
        master new (next fetch will store in remotes/dokku)

### 動作確認

IPv6がないのでLet's Encryptが使えず今回はSSL対応はスキップしますが、手っ取り早くDokkuで作成したアプリケーションが動いているか確認してみます。

まずはブラウザ経由で<IPアドレス>にアクセスするとNginxのWelcomeページが表示されることを確認しておきます。

```
<IPアドレス> ruby-getting-started.dokku.me
```

ここで指定した`dokku.me`というドメインはインストール後に設定したドメインです。

    $ dokku domains:set-global dokku.me

続いてhostsファイルを編集して、上記のURLに`curl`してみました。

    $ curl -I http://ruby-getting-started.dokku.me | head -n 2
    HTTP/1.1 200 OK
    Server: nginx

問題なさそうです。ブラウザ経由でもページは確認できました。

### まとめ

もともとこのマシンはDocker Swarm経由でデプロイをしていたのですが、これでもう少しデプロイしやすくなりました。
とりあえずこのまま使ってみて、使い勝手が良さそうであればまたDokkuのタイトルで投稿しようと思っています。
