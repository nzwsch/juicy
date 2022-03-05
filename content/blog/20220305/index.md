---
title: "Sourcegraphを導入してみる"
date: "2022-03-05T13:58:33.186+09:00"
description: "GitLab上で全文検索を実現するまで"
---

[Sourcegraph][sourcegraph]というWebアプリケーションがあるのですが、OpenGrokのようにソースコードを検索することができるようです。
まだほとんど使い始めて間もないのですが、GitLabと連携させることができるので複数のリポジトリを抱えているときは便利かなと思います。
特に難しいことはなかったのですが、今回はSourcegraphを導入するまでをまとめていこうと思います。

### 導入コスト

https://docs.sourcegraph.com/admin/install/docker

上記のURLでは評価版としてDockerを経由して手元で動かせるというもののようです。
しかしこれはあくまでローカルで動かすことが前提なので本番サーバーで動かすならば[Resource estimator][resource-estimator]で必要なリソースを確認しろとのこと。

このページを見てみると一番最小の構成が**5人**からのようで、それ以下に設定することができません。
なので**20% engagement rate**に変更して*ユーザー1人あたりおよそ5つのリポジトリ*に変更してみたのですが、それでも**推定総CPU数**が**30コア**、RAMに至っては**推定総メモリ**が**49g**と表示されていました。
クラウドサービスでもなかなか贅沢なリソースを必要とするようですが、複数ユーザーは用意するかもしれませんが動かす人間はたった一人なので多少遅くてもよいかなと思いました。

ちょうどAmazonで2万円弱程度で売っていたミニPCを使ってみようと思いました。
Xeonのようなサーバー用CPUではありませんが、わざわざ物理的にPCを増設したのは私なりの贅沢です。
少なくともSourcegraphの推奨どおりのサーバーを用意したらおそらく月額だけでもそこそこな金額になりそうな予感です。

### インストール

あらかじめWindows 10がプリインストールされているものの、本体にはライセンスのシールが貼っていなさそうなのでちょっと怪しい感じもするのでまずはOSを起動させてライセンスキーだけ確保しておき、**Ubuntu Server 20.04**をインストールしました。Sourcegraphのドキュメントでは[Digital Oceanで作るとき][digitalocean]**Ubuntu 18.04**が指定されていましたが、動かすのはDocker経由なのでOSのバージョンは今の所問題ないかなと思います。

私がUbuntu Serverをインストールするのが久しぶりだったので、ついついインストーラからDockerを選択してしまったのですが、**Snap Store経由のDockerはSourcegraphのコンテナが起動しない**ので選択しないほうがよいです。インストール時に間違えて選択してしまったとしても、Dockerをアンインストールすればよいので問題ありません。

というわけで、前置きが長くなりましたが先程の[Digital Ocean向けｎページ][digitalocean]にあるインストーラ用のスクリプトを使います:

```bash
#!/usr/bin/env bash

set -euxo pipefail

DOCKER_COMPOSE_VERSION='1.25.3'
DEPLOY_SOURCEGRAPH_DOCKER_CHECKOUT='/root/deploy-sourcegraph-docker'

# 🚨 Update these variables with the correct values from your fork!
DEPLOY_SOURCEGRAPH_DOCKER_FORK_CLONE_URL='https://github.com/sourcegraph/deploy-sourcegraph-docker.git'
DEPLOY_SOURCEGRAPH_DOCKER_FORK_REVISION='v3.37.0'

# Install git
sudo apt-get update -y
sudo apt-get install -y git

# Clone Docker Compose definition
git clone "${DEPLOY_SOURCEGRAPH_DOCKER_FORK_CLONE_URL}" "${DEPLOY_SOURCEGRAPH_DOCKER_CHECKOUT}"
cd "${DEPLOY_SOURCEGRAPH_DOCKER_CHECKOUT}"
git checkout "${DEPLOY_SOURCEGRAPH_DOCKER_FORK_REVISION}"

# Install Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
sudo apt-get update -y
apt-cache policy docker-ce
apt-get install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
curl -L "https://raw.githubusercontent.com/docker/compose/${DOCKER_COMPOSE_VERSION}/contrib/completion/bash/docker-compose" -o /etc/bash_completion.d/docker-compose

# Run Sourcegraph. Restart the containers upon reboot.
cd "${DEPLOY_SOURCEGRAPH_DOCKER_CHECKOUT}"/docker-compose
docker-compose up -d
```

コメントにも記載されていますがあくまで2022年2月時点の最新バージョンなので、もとのページからソースコードを編集したほうがよいと思います。
このPCは2.5インチSSDの拡張などはとくに行っていないので、Docker用のストレージは変更していません。
バックアップする対象のディレクトリは`/var/lib/docker`をまるごとコピーしてあげればよさそうです。

あとはこのスクリプトを実行するだけなのですが、行末の`docker-compose up -d`の箇所をコメントアウトします。

続いてスクリプトをroot権限で実行します。私は`DEPLOY_SOURCEGRAPH_DOCKER_CHECKOUT`のパスをSSHの実行ユーザーのディレクトリに変更しましたが、このあたりは任意です。

`git clone`したディレクトリに移動して、`docker-compose`ディレクトリに移動します。
若干面倒ですが、Caddyのコンテナで参照しているファイルが相対パスなので必要です。

続いて`docker-compose.yml`を編集して、各コンテナの`cpus`と`mem_limit`をすべてコメントアウトします。

リソースの指定をコメントアウトしてあげることで、CPUのコアが30コアに満たない環境でも一旦は動作させられるようになりました。
そのためアップグレード作業が若干面倒ですが、ここはしばらく我慢しようかなと思います。
あとは`sudo docker-compose up -d`を実行すればコンテナが起動します。

あとはポート80番か443番に直接ブラウザでアクセスして、会員登録の画面が表示されれば完了です。

### GitLabとの連携

続いてGitLabと連携させます。
連携する経路は2つあって、まずはGitLabからリポジトリ一覧を取得してコードを実際に検索させる方法。
もうひとつはGitLabのコード上でSourcegraphへリンクする方法です。

まずGitLabからの設定では[Personal Access Token][token]を用意します。
おそらく`read_repository`かなと思いきや、これだと権限が足りず、取り込みに失敗してしまうようなので`read_api`とほとんどすべての情報が見られる権限を付与しました。
私の場合取り込み時は3つしかリポジトリがなかったのですぐ確認できました。

### Sourcegraphとの連携

https://docs.gitlab.com/ee/integration/sourcegraph.html#sourcegraph-integration

あとはこのドキュメントを参考に管理者向けページにある設定画面からSourcegraph向けの設定を開けば完了です。
正しく設定できていればGitLabの検索バーから直接コードが検索できるようになります。
もともとGitLabには全文検索機能がなかったので、これでGitHubと同等以上になりました。

現時点だとまだまだ使い始めなのでリソース的にいつ限界を迎えるかはわかりませんが、ひとまずはこの状態で使い始めていこうと思っています。

[sourcegraph]: https://sourcegraph.com
[resource-estimator]: https://docs.sourcegraph.com/admin/install/resource_estimator
[digitalocean]: https://docs.sourcegraph.com/admin/install/docker-compose/digitalocean
[token]: https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html
