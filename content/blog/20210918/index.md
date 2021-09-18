---
title: "rails-promptについて"
date: "2021-09-18T13:12:28.337+09:00"
description: "node.jsで対話型のプログラムを作りました"
---

最近のRailsには`rails new APP_PATH --minimal`というコマンドが追加されました。

この`--minimal`というフラグ自体は便利なのですが、例えば`--minimal`だけどActiveStorageは使いたいという[前回の投稿](/blog/20210912/)のようなものを作りたい場合は`rails new APP_PATH --minimal --no-skip-active-storage`というような組み合わせはうまく動作しません。

> Something similar to `eslint --init` ?

もともとは簡単なシェルスクリプトを書く予定だったのですが、[Interactive “rails new”](https://discuss.rubyonrails.org/t/interactive-rails-new/74355)のスレッドにあったESLintのような対話型のコマンドのこと?というコメントを見て面白そうだなと思いました。

https://github.com/eslint/eslint/blob/a79c9f35d665c2bcc63267bdf359a8176e0a84ce/lib/init/config-initializer.js#L16

確かにESLintのようなコマンドはどうやって実現しているのだろうと興味を持ったので、調べてみたのですがちょうど[**Enquirer**](https://github.com/enquirer/enquirer)というライブラリが使われていました。

```javascript
const { prompt } = require('enquirer');

const response = await prompt({
  type: 'input',
  name: 'username',
  message: 'What is your username?'
});

console.log(response); // { username: 'nzwsch' }
```

質問形式をオブジェクトを渡せばいいだけなので簡単そうです。
複数の質問は配列で渡せばよいのでそこまで悩むこともありませんでした。

https://github.com/nzwsch/rails-prompt

このコード量なのでわざわざGitHubにプッシュしなくても良かった気もしますが、今後も使うことを考えるとやっぱり用意しておいてもよかったかなと思います。
