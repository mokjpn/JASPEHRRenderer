# 識別子の説明修正と contained ValueSet デモ

両案の性別を `type: "choice"`、`answerValueSet: "#demo-sex-values"` に変更し、Questionnaire.contained の ValueSet を参照します。性別には `answerOption` を併記しません。案１の概念注釈と独立したSDTM対応表、案２のSpecialization注釈、従来のanswerOptionサンプルは維持します。

## IDはBCで表現できないのか

**できないという意味ではありません。** 固定版COSMoSの収録と、その文脈で検証できた対応の範囲を示しています。

[公式BC export・固定commit 031429b](https://github.com/cdisc-org/COSMoS/blob/031429b1d14823721991cd23ee88a11616686ce3/export/cdisc_biomedical_concepts_latest.csv) を全件再確認しました（1475 BC、6306行、ファイルSHA-256 `4273fdd56880e5d051a1c65cb90062f994a3836002f267ae4385097d51645ed6`）。Identifier `C25364` と Unique Identifier `C70663` は実在しますが、このexportではDECを持たない抽象的な項目です。Sponsor Study Reference Identifier `C135009` もありますが、[公式Specialization export](https://github.com/cdisc-org/COSMoS/blob/031429b1d14823721991cd23ee88a11616686ce3/export/cdisc_sdtm_dataset_specializations_latest.csv) では `TS/SPREFID` の文脈で、単に `DM.STUDYID` と同一視できません。

同じ固定版Specialization exportにSTUDYID／SUBJID／USUBJID／SITEID変数の行は確認できませんでした。この検索結果は、将来・別パッケージ・独自概念での表現可能性を否定する証拠ではありません。本デモでは公式の具体的BC＋DEC対応を捏造せず、案１の独立 `crfMapping` と案２の実験的 `sdtmVariableTarget` が、それぞれ既知の `DM.STUDYID`／`DM.SUBJID` を示します。`SUBJID` は研究内IDであり、研究横断の `USUBJID` を生成する仕様とは区別します。

生年月日には[公式BRTHDTC Specialization](https://github.com/cdisc-org/COSMoS/blob/031429b1d14823721991cd23ee88a11616686ce3/yaml/20250701_r12/sdtm/sdtm_brthdtc.yaml)があり、BC `C83217`＋DEC `C82515` を使用しています。今回、案１の生年月日をこの組に整合し、案２も `BRTHDTC.BRTHDTC` に更新しました。以前の `C83217/C70856` も公式BC内の組としては存在しますが、上記SpecializationのBRTHDTC変数のDECとは異なります。また同じ `C83217/C82515` はそのSpecialization内でDMDTCにも付いているため、BC＋DECだけからSDTM変数を一意に決められない実例でもあります。年齢基準日はreferenceDateという入力役割であり、治療開始日や採取日時とは同一視しません。

## 固定したCTと試作canonical

[NCI/CDISC SDTM Controlled Terminology 2025-03-28版PDF](https://evs.nci.nih.gov/ftp1/CDISC/SDTM/Archive/SDTM%20Terminology%202025-03-28.pdf#page=1396) の印刷頁1396で、SEX `C66731` は非拡張、全４候補と確認しました。**特定サブセットではなく、この固定版のcodelist全体**です。

| Coding.code（CDISC Submission Value） | display（NCI Preferred Term） | 別に保存するNCI code |
| --- | --- | --- |
| F | Female | C16576 |
| INTERSEX | Intersex | C45908 |
| M | Male | C20197 |
| U | Unknown | C17998 |

[sex-codesystem.json](sex-codesystem.json) はcodelistごとの試作CodeSystemです。`https://example.org/jaspehr-demo/CodeSystem/cdisc-sex` は**ローカル試作canonicalで、公式CDISC canonicalでもNCIt systemでもありません**。そのcodeにSubmission Valueを使い、NCI codeはconcept.propertyの `ncit-code` に別保存します。NCIt systemに対して `code=M` とするような混在はしません。

CodeSystem.versionの `2025-03-28` は、このローカル表現が採用した**CTリリース**を追跡します。BCのpackageDateやFHIR版ではありません。ValueSet自身のローカル版は `2025-03-28-demo-1` と区別し、回答Coding.versionにはCodeSystem.versionを保存します。displayは英語Preferred Term、質問ラベルは日本語併記です。

## サーバなしの生成と解決

[sex-valueset.json](sex-valueset.json) と両Questionnaireのcontained ValueSetには、composeのsystem/version指定に加えて、**事前展開済みexpansion**（total=4、offsetなし、各項目のsystem/version/code/display）を収録します。上表を一次資料と照合してローカルCodeSystemの４conceptを作り、同一情報をexpansion.containsへ写す決定的な生成です。[生成根拠](sex-ct-provenance.json)には一次資料URL・頁・CT版・ローカル版・行データのSHA-256を記録します。元の1650頁PDFはWebのPDF読取機能で確認し、元ファイルのSHA-256は計算していないため、捏造せずnullとしています。

CodeSystemは独立した配布ファイルであり、QuestionnaireにはValueSetだけをcontainedで収録します。CodeSystemを追加でネットワーク取得せず、expansionから選択肢を構成します。CDISCCT2ValueSetそのものを実行した成果物ではなく、依頼時に示された「codelist別CodeSystem、Submission Valueをcode、NCI codeはproperty、compose-only ValueSet、example.org試作canonical」という要点を参考に、オフライン利用用expansionを加えたものです。

resolverは**exactな#idの一意のcontained ValueSet、closed choice、完全な有限expansion**のみ対応します。compose-only、外部canonical、参照欠落・重複・型違い、partial expansion、整合しないtotal、重複Coding、欠落system等はエラーにします。nested containsのabstract headerとinactiveコードは選択不可とします。任意ネットワーク解決やcompose/filter/importの実行はありません。事前展開は作者が用意した固定snapshotを信頼する方式で、オンラインCT照会・認証・最新性保証の代わりではありません。ValueSetのcomposeを変更する場合は、対応する完全なexpansionも再生成する必要があります。

## 制約と出力

FHIR R4 [que-4](https://hl7.org/fhir/R4/questionnaire-definitions.html#Questionnaire.item.answerValueSet) のanswerOptionとの排他制約、および[contained canonical fragment](https://hl7.org/fhir/R4/references.html#canonical-fragments) を使用します。FHIRの標準構造ですが、JASPEHR IGで当面推奨されるanswerOption経路に対する**機能拡張デモ**であり、標準JASPEHR適合宣言や新しいFHIR extension canonicalの提案ではありません。公式IG全文の適合検証はしていません。

候補表示だけでなく、回答のcode/system/CodeSystem versionを許可Codingと厳密に照合します。未知コード、別codelistのFEMALE／NOT REPORTED、NCItコードとの混在、別system、誤版・版欠落、自由文字列、単一回答項目への複数Codingは検証エラーです。無効な回答や未解決bindingのQuestionnaireResponse生成・ダウンロード・コピーは拒否し、デバッグプレビューもエラーを表示します。保存済みの無効な回答を黙って別のQuestionnaireに置き換えません。正しい回答は許可snapshotのCodingとしてcode/system/version/displayを出力し、不正なdisplayや余分な状態プロパティはコピーしません。既存answerOptionやenableWhenの振る舞いは維持します。

Annotated CRFには４候補のcode/displayとcontained参照・ValueSet版・ローカルsystem・CodeSystem版が表示されます。定義ベースの空欄フォームであり、患者回答や年齢計算は含みません。意図記述もValueSet文字列も実行しません。

## 検証と未確認事項

19件の既存focused tests、10件のcontained-ValueSet tests、DOMでの両案選択・正常Coding出力・誤版保存状態・que-4・未解決参照・compose-only・外部URLの拒否とネットワーク呼出しゼロを検査します。通常・standalone両build、両見本PDFの日本語・候補・版の表示と全９項目の注釈を検査します。

両見本PDFはWeasyPrintによる生成です。**実ブラウザの表示、直接ファイル起動、Print / Save as PDFは引き続き未検証**です。本変更は既存デモブランチでの配布用です。mainへのマージ・デプロイは含みません。

## 提供レポートとの関係

ユーザー添付レポートの本文を親スレッド経由で受領し、技術的な前提を確認しました。[公開変換器の固定commit](https://github.com/mokjpn/CDISCCT2ValueSet/blob/e811e52c346dfd5e8af59b7d2df2569b5747dd0e/scripts/csv_to_fhir_codesystem.py) では `display` はCDISC Synonym(s)全体（空ならSubmission Value）、propertyは `ncit-code`、business versionの既定は `0.1.0`、ValueSetはcompose-onlyです。本デモはNCI Preferred Termをdisplayに使い、固定CTリリースを追跡するローカルCodeSystem版と別のValueSet版を明示し、事前展開を加えています。したがって同変換器のビット同一出力やslug/hash生成規約を再現したとは主張しません。WGの最終承認・全ベンダー対応・本番採用を裏付ける実装とも主張しません。原レポートの外部ValueSetという当時の説明を、FHIRのcontained canonical利用を禁止する指示とは解釈していません。レポート本文や私的資料は成果物に転載せず、関係する公開仕様だけを参照しています。

最終確認：29件（既存19＋ValueSet10）のfocused tests、DOM検査、両build、両PDF検査を通過。案２は３頁、案１は４頁で、更新後の全７頁を目視確認しました。Coding初期値の正しい版は選択・保存され、誤版は黙って失われずエラー表示されることも検査済みです。
