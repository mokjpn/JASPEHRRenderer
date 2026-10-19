# 案１・案２の比較デモ

同じ９入力項目を、案１（Biomedical Concept、BC ＋ Data Element Concept、DEC）と案２（Study Data Tabulation Model、SDTM Dataset Specialization）で比較します。Case Report Form（CRF）の注釈は定義から生成し、入力済みの回答には依存しません。

アプリの **Load Plan 1: BC + DEC / 案１** と **Load baseline BP demo / 案２** で切り替えます。切替は回答をリセットします。印刷プレビューはどちらも **Annotated CRF preview / PDF…** → **Print / Save as PDF** です。フォームなしで注釈だけを比較する場合は、自己完結した [comparison.html](comparison.html) をダウンロードして開いてください。

| 成果物 | 案１ | 案２ |
| --- | --- | --- |
| Questionnaire JSON | [BC + DEC版](baseline-bp-questionnaire-concept.json) | [Specialization版](baseline-bp-questionnaire.json) |
| 印刷HTML | [案１](annotated-crf-concept.html) | [案２](annotated-crf.html) |
| 見本PDF | [案１・４頁](annotated-crf-concept.pdf) | [案２・３頁](annotated-crf.pdf) |

案１の独立した対応表は [concept-crf-mapping.json](concept-crf-mapping.json)。[スタンドアロンアプリ](index.standalone.html) は入力フォームと両案の切替を含みます。

## 標準と実験的な部分

- BC・DECの識別子と所属は公式CDISCメタデータを参照しています。ただし、その組だけからSDTMの変数やSpecializationが一意に決まるとは扱いません。
- `cdiscConcept` と `mappingIntent` はrevision 4の独自authoring提案です。標準FHIR（Fast Healthcare Interoperability Resources）／JASPEHR拡張としては主張しません。
- `crfMapping` はこの比較デモで追加した**独立した明示的な実験用CRF対応表**です。`direct` は入力項目のlinkId、`derived` はmappingIntentを持つgroupのlinkIdを参照し、`target` に表示用SDTM先を記録します。概念コードを検索して変換する処理ではありません。
- `crfMapping` を削除すると、BC・DECだけの項目はSDTM先未解決となり、直接入力には「Not mapped」の表示が付きます。意図記述から対応先を補完しません。
- `annotationPlan`、`conceptNotMappedReason`、従来の `sdtmVariableTarget`、`mappingNote`、`mappingNotMappedReason` も実験用のローカル属性です。標準canonical URLを新設していません。

## 確認済み概念と例外

| 意味 | BC | DEC |
| --- | --- | --- |
| 収縮期血圧の結果 | C25298 | C70856 |
| 拡張期血圧の結果 | C25299 | C70856 |
| 脈拍の結果 | C49676 | C70856 |
| 性別 | C28421 | C28421 |
| 生年月日 | C83217 | C82515 |
| 導出される年齢 | C69260 | C170981 |

[公式CDISC COSMoSの固定版BC export](https://github.com/cdisc-org/COSMoS/blob/031429b1d14823721991cd23ee88a11616686ce3/export/cdisc_biomedical_concepts_latest.csv) で各組を照合しました。revision 4のdirectConceptとderivedConceptの組を維持しています。生年月日は公式概念のdatetimeに対して本デモでは日付のみを収集し、血圧もdecimal概念に対し元のinteger入力を維持するため、完全な概念実装適合性は主張しません。公式メタデータに基づく内容は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で利用し、デモ用の表示と対応表を追加しています。

研究IDと研究内参加者IDには、適切な公式BC・DECの組をこの確認範囲で確定できていないため捏造しません。例外を表示し、別表で既存の `DM.STUDYID`／`DM.SUBJID` へ対応付けます。`DM.USUBJID` の生成・同一人物の研究横断識別は行いません。年齢基準日は `referenceDate` という入力役割のみを持ち、採取日時や治療開始日の概念と同一視しません。自由記述メモは概念・SDTM先とも未設定と明記します。性別・脈拍・IDを含む全項目に注釈があります。

生年月日と年齢基準日は、年齢概念を導出する入力として記述し、独立した対応表が表示先 `DM.AGE` を指定します。各日付が直接AGEになるとは記述しません。意図と任意の `derivationDescription` は不活性な文字列であり、計算・FHIRPath・eval・Functionへの受渡しはありません。年齢は計算しません。公式AGE SpecializationのCollectedと本デモのDerivedの違い、および日付・丸め等の未決定事項は両案とも表示します。

## 検証範囲

通常・standalone両build、19件のfocused tests、DOM（Document Object Model）による切替・回答出力・比較HTMLのテスト、両PDFの文字抽出と全入力項目の注釈検査を実施。概念だけではSDTM先を推論しないこと、明示的対応表の参照欠落・重複、文字のエスケープ、非実行、QuestionnaireResponseへのメタデータ非混入も検査します。全４頁の案１PDFを目視確認しました。

両見本PDFは **WeasyPrint** による生成です。Chromiumのsandbox helperの問題により、**実ブラウザの表示・直接ファイル起動・Print / Save as PDFは未検証**です。DOMテストとWeasyPrintの検証は実ブラウザ検証の代わりとはしません。ブラウザでは改頁位置が変わる場合があります。比較版はデモブランチでの配布を対象とし、mainへのマージ・デプロイは含みません。

## contained ValueSetと識別子の追加確認

両案の性別はcontained ValueSet参照に更新しました。固定CTの全４候補、prototype canonical、版の区別、回答の強制検証、IDをBCで表現不可能とはしない説明、生年月日DECの再確認については [CONTAINED-VALUESET.md](CONTAINED-VALUESET.md) を参照してください。新しい構成は19件の既存検査に10件のValueSet検査を加えています。
