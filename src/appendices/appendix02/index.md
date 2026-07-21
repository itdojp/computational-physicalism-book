# 付録B：参考文献一覧

本書本文の各章末にある「参考文献」から、参照先を集約した一覧です。

## 主張範囲レビューゲート（2026-07-21 JST更新）

本付録は、本文の哲学・物理・計算理論上の主張を確認するための出典導線です。更新時は、本文の断定を次の区分に分けて確認します。

- **実証済み事実**: 論文、標準、公式資料、実験結果に基づく記述。
- **数学的・形式的主張**: 定義、仮定、定理、証明スケッチの範囲を明示する記述。
- **哲学的立場**: 物理主義、機能主義、計算主義など、反対説があり得る前提。
- **思考実験・擬似コード**: 理解補助の例であり、実装済みシステムや汎用証明ではない記述。
- **編集上の解釈**: 出典から直接得られる結果ではなく、本書が採用する要約、設計判断、規範的提案。
- **仮説・将来予測**: 反証・更新の対象となる概算、シナリオ、将来像。観測済みの事実として扱わない記述。
- **時点依存情報**: AI規制、標準、モデル能力、電力制約など、確認日が必要な記述。

本文で「示す」「証明する」「必然」「実現可能」と書く場合は、上記のどの区分に属するかを明示し、必要に応じて「本書の前提に立てば」「操作的には」「仮説として」などの限定を付けます。1つの段落や節に複数の区分が含まれる場合は、該当する区分をすべて併記します。

### 本文での表示契約

第3〜5章では、非自明な主張群の直前に次の形式で区分を表示します。

```text
> **主張区分**: `実証済み事実` / `時点依存情報` / `編集上の解釈`
> **確認日**: YYYY-MM-DD
> **再確認条件**: 参照資料、対象範囲、制度、モデル能力などが変わったとき
```

- `時点依存情報`を含む表示には、確認日と具体的な再確認条件を必須とします。
- 数値レンジは、出典または導出経路を示します。どちらもない場合は`仮説・将来予測`とし、用途、前提、更新条件を明示します。
- 擬似コード内の数値は実測値とみなさず、本文の表示に従って例示または感度分析用の値として読みます。
- 区分表示は主張の正しさを保証するものではありません。読者が証拠、前提、編集判断を分けて検討するための境界です。

## 文献

- Azevedo, F. A. C., et al. (2009). Equal numbers of neuronal and nonneuronal cells make the human brain an isometrically scaled-up primate brain.（関連：第1章）
- Baars, B. J. (1988). A cognitive theory of consciousness.（関連：第3章）
- Balasubramanian, V. (2021). Brain power. Proc Natl Acad Sci U S A, 118(32), e2107022118.（関連：第1章）
- Churchland, P. M. (1988). Matter and Consciousness.（関連：第1章）
- Cybenko, G. (1989). Approximation by superpositions of a sigmoidal function.（関連：第2章）
- Dennett, D. C. (1991). Consciousness Explained.（関連：第1章）
- European Union. (2024). Regulation (EU) 2024/1689 laying down harmonised rules on artificial intelligence（AI Act）.（関連：第5章、確認日：2026-07-21） https://eur-lex.europa.eu/eli/reg/2024/1689/oj
- Franklin, S., et al. (2016). LIDA: A systems-level architecture for cognition.（関連：第3章）
- Hornik, K. (1991). Approximation capabilities of multilayer feedforward networks.（関連：第2章）
- Ishiguro, H. (2009). ロボットとは何か.（関連：第1章）
- International Energy Agency. (2025). Energy and AI.（関連：第1章・第5章） https://www.iea.org/reports/energy-and-ai
- Kaplan, J., et al. (2020). Scaling laws for neural language models.（関連：第3章）
- Hoffmann, J., et al. (2022). Training Compute-Optimal Large Language Models.（関連：第3章、Chinchilla）
- ISO/IEC. (2023). ISO/IEC 42001 Artificial intelligence - Management system.（関連：第5章） https://www.iso.org/standard/42001
- NIST. (2023). Artificial Intelligence Risk Management Framework (AI RMF 1.0).（関連：第5章） https://www.nist.gov/itl/ai-risk-management-framework
- OpenAI. (n.d.). Learning to reason with LLMs.（関連：第3章、アクセス日：2026-03-01）
- Schaeffer, R., et al. (2023). Are Emergent Abilities of Large Language Models a Mirage?（関連：第3章）
- Siegelmann, H. T. (1995). Computation beyond the Turing limit.（関連：第2章）
- Tononi, G. (2008). Consciousness as integrated information.（関連：第3章）
- Turing, A. M. (1950). Computing Machinery and Intelligence.（関連：第1章）
- Valiant, L. (1984). A theory of the learnable.（関連：第1章・第2章）
- Watanabe, M. (2017). 脳の意識 機械の意識.（関連：第1章）
- Wei, J., et al. (2022). Emergent abilities of large language models.（関連：第3章）
- Wu, Y., Sun, Z., Li, S., Welleck, S., Yang, Y. (2024). Inference Scaling Laws: An Empirical Analysis of Compute-Optimal Inference for Problem-Solving with Language Models.（関連：第3章）
