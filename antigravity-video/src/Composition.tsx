import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { Opening } from "./components/Opening";
import { ChangeScene } from "./components/ChangeScene";
import { Closing } from "./components/Closing";
import { sf } from "./utils/speed";

export const MyComposition: React.FC = () => {
  const { fps } = useVideoConfig();
  const open = sf(5 * fps);
  const change = sf(15 * fps);
  const close = sf(10 * fps);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f0f1a",
        fontFamily:
          "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Yu Gothic', 'Meiryo', system-ui, sans-serif",
      }}
    >
      <Sequence from={0} durationInFrames={open}>
        <Opening />
      </Sequence>

      <Sequence from={open} durationInFrames={change}>
        <ChangeScene
          number={1}
          title="Gemini CLI 廃止"
          before="Gemini CLI"
          beforeSub="（旧コマンドラインツール）"
          after="Antigravity CLI"
          afterSub="（新ツール・移行必須）"
          reason="バラバラだったツールを1つにまとめて、もっと使いやすくするため"
          bullets={[
            "⚠️ 6月18日が期限！ 移行しないとある日突然使えなくなります",
            "企業契約・GitHub経由のアクセスは引き続き継続",
            "個人・無料プランのユーザーは今月中に移行作業を",
          ]}
          accentColor="#EA4335"
        />
      </Sequence>

      <Sequence from={open + change} durationInFrames={change}>
        <ChangeScene
          number={2}
          title="ツールの役割が大きく変わった"
          before="コードを自分で書く"
          beforeSub="（Visual Studio Code ベースのエディタ）"
          after="AIに指示して確認する"
          afterSub="（エージェント管理専用アプリへ）"
          reason="細かいコードはAIに任せて、人間はもっと大事な判断に集中できるようにするため"
          bullets={[
            "複数のAIが並行して自動で動き、長時間処理もバックグラウンドで実行",
            "/goal（目標達成まで自動）・/schedule（予約実行）など新コマンドが追加",
            "チームの仕事の進め方・役割分担自体が変わる可能性あり",
          ]}
          accentColor="#4285F4"
        />
      </Sequence>

      <Sequence from={open + change * 2} durationInFrames={change}>
        <ChangeScene
          number={3}
          title="AIモデルが約4倍高速化"
          before="Gemini 3.1 Pro"
          beforeSub="（従来の主力モデル）"
          after="Gemini 3.5 Flash"
          afterSub="⚡ 約4倍速・性能も上回る"
          reason="待ち時間が長いと作業が止まる。4倍速くしてストレスなく開発できるようにするため"
          bullets={[
            "ほぼ全ての性能テストで Gemini 3.1 Pro を上回る結果",
            "APIから呼び出せるのでプロダクトへの組み込みも切り替え可能",
            "リアルタイム処理・チャット機能など速度が重要な場面で特に効果大",
          ]}
          accentColor="#34A853"
        />
      </Sequence>

      <Sequence from={open + change * 3} durationInFrames={change}>
        <ChangeScene
          number={4}
          title="複雑な処理が「1回の命令」で完結"
          before="何度もAPI呼び出しが必要"
          beforeSub="（複数ステップを手動でつなぐ複雑な仕組み）"
          after="1回の命令だけで完結"
          afterSub="（AIが判断・実行まですべて自動）"
          reason="AI機能の開発コストを下げ、誰でも複雑な自動化を作りやすくするため"
          bullets={[
            "AIが判断・ツール使用・コード実行まで一連の作業を自動で完結",
            "安全な隔離環境内で処理されるので信頼性も高い",
            "社内ツールへのAI組み込みの工数が大幅に減る見込み",
          ]}
          accentColor="#FBBC05"
        />
      </Sequence>

      <Sequence from={open + change * 4} durationInFrames={change}>
        <ChangeScene
          number={5}
          title="入力するだけでAndroidアプリが作れる"
          before="アプリ開発に専門知識が必要"
          beforeSub="（ブラウザ上のAI操作が中心）"
          after="テキスト指示だけで自動生成"
          afterSub="（高品質なAndroidアプリを即作成）"
          reason="モバイル開発の知識がなくても素早くプロトタイプを作れるようにするため"
          bullets={[
            "企画・デモ用アプリを短期間で用意したい場面で特に効果的",
            "開発リソースが限られたチームでも新機能の検証がしやすくなる",
            "アイデアを形にするスピードが大幅にアップ",
          ]}
          accentColor="#EA4335"
        />
      </Sequence>

      <Sequence from={open + change * 5} durationInFrames={close}>
        <Closing />
      </Sequence>
    </AbsoluteFill>
  );
};
