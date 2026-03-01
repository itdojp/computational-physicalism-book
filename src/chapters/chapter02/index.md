# 第2章：計算可能性理論による論証の枠組み

## はじめに

[第1章](../chapter01/)では、計算論的物理主義の概要を提示しました。本章では、計算可能性理論と学習理論の枠組みを用いて、「人間の知性は原理的にAIによって模倣可能である」という主張を**どの前提の下で、どの強度まで**述べられるかを整理します。

注意：本章は結論の「数学的証明」を与えるものではありません。Physical CTT（物理CTT）を含む前提を置いたときに、模倣可能性の議論がどのように立ち上がるかを、反例クラスも含めて透明化することが目的です。

本章は、理論計算機科学や学習理論の基本的な枠組みに触れたことがある読者を主な対象としています。数式やビッグオー記法（`O(1)` など）の細部まですべて理解できなくても、「どの仮定が、どの結論を支えているか」を追うことを目標に読み進めてください。

## この章でできるようになること

- Physical CTT を Bold/Modest に分け、本書が採用する形（Modest）と射程/反例クラスを説明できるようになる。
- 「計算可能性（computability）」と「効率（複雑性）」を区別し、量子計算が主にどちらの論点に関わるかを説明できるようになる。
- 「有限性」「PAC学習理論」「万能近似定理」が、条件付きの模倣可能性の議論にどう接続するかを要約できるようになる。
- 知性を計算量として定義し、知性の階層化（パターン踏襲/最適化/創造）の意図を説明できるようになる。
- 機能的等価性を「全入力の一致」ではなく、分布・サンプル・統計保証として取り扱う理由を説明できるようになる。

## 前提：チャーチ＝チューリングと Physical CTT

### 古典的チャーチ＝チューリングのテーゼ

> 効果的に計算可能な関数は、チューリングマシンによって計算可能である。[^sep-church-turing]

### Physical CTT（Bold/Modest）— 本書の採用形

Physical CTT は「物理的に実現可能な計算過程」を計算モデルで扱える、という主張の総称です。[^sep-computation-physicalsystems]

定義・射程・反例クラスは[第1章](../chapter01/)に集約します。本章では、以後の議論の前提として **Modest（控えめ）** を採用します（Bold は射程が広い形、Modest は観測・制御可能性や有限精度・有限時間を前提に射程を限定する形）。

### 量子計算：計算可能性と効率（複雑性）の分離

- **計算可能性**：標準的な量子計算は、チューリング計算の意味での「計算可能関数」の範囲を拡張しない、という理解が一般的です。[^sep-qt-quantcomp]
- **効率（複雑性）**：一方で、量子計算は一部の問題で計算量（時間/サンプル数）を大きく変え得ます。これは「何が計算できるか」ではなく、「どれだけ効率よく計算できるか」の論点です。

## 論証の構造

### 論点1：有限資源・有限精度としての「有限性」

**主張（作業仮説）**：脳の情報処理を、有限精度・有限時間の範囲で観測・制御可能な物理過程として扱うとき、（確率的）計算過程としてモデル化できる。

**スケッチ**：

```text
1. 脳は有限個の構成要素（ニューロン/シナプス）から成る（ニューロン数の推定は第1章参照）
2. 観測・制御は有限精度であり、状態を有限ビット列へ量子化して扱う
3. 有限時間の状態遷移列として、（確率的）計算手続きに写像できる
∴ 「有限精度・有限時間」の範囲では、有限状態機械として近似した議論が可能
```

注意：ここで言う「有限」は、神経ダイナミクスが本質的に離散だと断定する意味ではありません。連続系に非可計算な挙動を許す理想化や、無限精度の読み出しが可能だと仮定する場合、本書の前提（Physical CTT, Modest）は再検討が必要です。[^sep-computation-physicalsystems]

### 論点2：有限の観測による関数近似（PAC）

**主張（前提つき）**：入力が分布 D から独立同分布（i.i.d.）で観測され、仮説クラス H が有限VC次元などの条件を満たし、かつ f が H で実現可能（または近似可能）であるとき、有限サンプルから確率 1-δ で汎化誤差が ε 以下となる仮説 f' を学習できる。

**要点（PAC学習理論の位置づけ）**：

以下のコードは、PAC 学習理論のアイデアを直感的に示すための擬似コードです。理論の厳密な証明や、実際にそのまま実装できる汎用アルゴリズムを提供することが目的ではなく、「有限個のサンプルから、ある程度正しい仮説を学習する」というイメージを掴むためのものとして読んでください。
```python
def pac_approximation(f, epsilon, delta):
    """
    f: 目標関数（人間の知的活動）
    epsilon: 許容誤差
    delta: 失敗確率の上限
    """
    # サンプル複雑性
    m = compute_sample_complexity(epsilon, delta, vc_dim)
    
    # m個の入出力ペアを観測
    samples = [(x_i, f(x_i)) for i in range(m)]
    
    # 仮説クラスHから最良の近似を選択
    f_prime = empirical_risk_minimization(samples, H)
    
    # 確率 1-δ 以上で（分布D上の）誤差が epsilon 以下となる f_prime を得る
    return f_prime
```

VC次元が有限の仮説クラスに対し、必要なサンプル数は次の通りです。
```text
m = O((1/ε²)(d·log(1/ε) + log(1/δ)))
```
ここで、dはVC次元です。

この種の保証は、入力がある分布 D から（近似的に）独立同分布で観測される、という前提を置きます。したがって、次は直接には保証しません。

- **全入力（∀入力）**での一致
- **最悪ケース**での一致
- **敵対的入力**（攻撃者が入力を選ぶ状況）での一致

### 論点3：ニューラルネットワークの近似能力（万能近似定理）

**Cybenko (1989), Hornik (1991)**：
> 1層の隠れ層を持つフィードフォワードニューラルネットワークは、コンパクト集合上の任意の連続関数を任意の精度で近似できる。

```python
class UniversalApproximator:
    def __init__(self, input_dim, hidden_units):
        self.W1 = random_matrix(hidden_units, input_dim)
        self.b1 = random_vector(hidden_units)
        self.W2 = random_matrix(1, hidden_units)
        self.b2 = random_scalar()
    
    def forward(self, x):
        # 任意の連続関数を近似
        h = sigmoid(self.W1 @ x + self.b1)
        return self.W2 @ h + self.b2
```

## 計算量仮説の形式化

### 定義：知的活動の計算量

知的活動を探索問題として次のように定式化します。

```text
Intelligence(P) = min{T(A) | A solves P}
```

ここでの記号は次の通りです。
- P：問題（探索空間S、評価関数v: S → R）
- A：アルゴリズム
- T(A)：Aの時間計算量

### 知性の階層

```python
class IntelligenceHierarchy:
    PATTERN_FOLLOWING = 0  # O(1) - 定数時間
    OPTIMIZATION = 1       # O(poly(n)) - 多項式時間
    INNOVATION = 2         # O(exp(n)) - 指数時間以上
    
    @staticmethod
    def classify(computation_time, input_size):
        if computation_time == O(1):
            return IntelligenceHierarchy.PATTERN_FOLLOWING
        elif computation_time <= O(input_size ** k):  # k: 定数
            return IntelligenceHierarchy.OPTIMIZATION
        else:
            return IntelligenceHierarchy.INNOVATION
```

ここでの `O(1)` は、入力サイズが変わっても処理時間がほとんど変わらない単純な処理を指します（例：固定のテンプレートに値を埋め込むだけの処理）。  
一方で `O(exp(n))` は、入力が少し増えるだけで計算時間が爆発的に増える探索問題を表現しており、本章ではこの違いを手がかりに知性の階層を捉え直しています。

## ブラックボックス等価性の形式化

### 定義：機能的等価性

2つのシステムS₁、S₂が機能的に等価であることを「全入力での一致」として理想化すると次のように書けますが、実務上これは検証不能です。

```text
∀x ∈ Input: |S₁(x) - S₂(x)| < ε
```

本書では、観測可能な範囲での主張として、入力分布D上の確率保証（PAC/統計保証）を中心に扱います。

```text
Pr_{x ~ D}[ distance(S₁(x), S₂(x)) < ε ] ≥ 1 - δ
```

これは「分布Dに関して高い確率で近い」ことを意味し、**最悪ケース**や**敵対的入力**に対する保証は別途の設計（テスト設計、ロバスト性、セキュリティ評価など）を要します。

### 実装：等価性検証アルゴリズム

```python
def verify_equivalence(system1, system2, test_inputs, epsilon):
    """
    ブラックボックス等価性の検証（test_inputs が分布Dからのサンプルである前提）
    """
    for x in test_inputs:
        y1 = system1(x)
        y2 = system2(x)
        if distance(y1, y2) >= epsilon:
            return False, x  # 反例
    
    # 統計的保証
    confidence = compute_pac_confidence(len(test_inputs), epsilon)
    return True, confidence
```

## 模倣の階層的アプローチ

### レベル1：行動レベルの模倣

```python
class BehavioralImitation:
    def __init__(self, observations):
        self.model = train_sequence_model(observations)
    
    def predict(self, context):
        return self.model.generate(context)
```

### レベル2：認知プロセスの模倣

```python
class CognitiveImitation:
    def __init__(self, cognitive_traces):
        self.working_memory = WorkingMemory(capacity=7±2)
        self.long_term_memory = LongTermMemory()
        self.attention = AttentionMechanism()
    
    def think(self, input_data):
        attended = self.attention.focus(input_data)
        relevant_memories = self.long_term_memory.retrieve(attended)
        return self.working_memory.process(attended, relevant_memories)
```

### レベル3：創発的特性の模倣

```python
class EmergentImitation:
    def __init__(self, num_agents):
        self.agents = [CognitiveAgent() for _ in range(num_agents)]
        self.connections = self.create_network_topology()
    
    def simulate(self, timesteps):
        for t in range(timesteps):
            # 局所的相互作用から大域的パターンが創発
            for agent in self.agents:
                neighbors = self.get_neighbors(agent)
                agent.update(neighbors)
```

## 反論への応答

本節は反論を数学的に「反証」することが目的ではありません。本書が採用する前提（Physical CTT, Modest / 機能主義）に照らして、論点がどこに残るかを整理します。

### 反論1：ゲーデルの不完全性定理

**反論**：「人間は形式システムの限界を超えた真理を認識できる」

**応答（立場の明示）**：
ゲーデルの不完全性定理は形式体系の限界を示しますが、「人間がその限界を超える」主張には、脳の推論が非計算的であることを別途示す必要があります。本書はその追加仮定を採用せず、推論も物理過程としてモデル化する立場（Physical CTT, Modest）を取ります。

以下はアイデアを示す擬似コードです。
```python
def goedel_response():
    # 人間もまた形式システムである
    human_system = FormalSystem(axioms=physics_laws)
    
    # ゲーデル文G：「Gは証明できない」
    G = goedel_sentence(human_system)
    
    # 人間がGを真と認識できるのは、メタレベルに立つから
    # しかし、そのメタレベルも別の形式システム
    meta_system = FormalSystem(axioms=extended_physics)
    
    # 無限後退するが、各レベルは計算可能
    return "各レベルでの推論は計算可能"
```

### 反論2：クオリアの問題

**反論**：「主観的体験は計算では捉えられない」

**応答（立場の明示）**：
本書は機能主義的に、外部から検証可能な入出力の一致を評価対象とします。これは主観的体験の同一性を否定/証明するものではなく、工学的議論として射程外に置く、という整理です。

```python
def functional_equivalence_suffices():
    # クオリアの有無に関わらず、行動が同一なら機能的に等価
    human_response = human.experience_red()
    ai_response = ai.process_wavelength(700nm)
    
    assert behavioral_equivalence(human_response, ai_response)
    # 内的体験の差異は外部から観測不可能
```

## 実証的検証の可能性

### 段階的検証プログラム

1. **部分的認知機能**（現在〜10年）
   - 言語理解、視覚認識、問題解決
   - 既に多くの領域で人間レベルに到達

2. **統合的認知機能**（10〜30年）
   - マルチモーダル理解、文脈依存推論
   - 現在急速に発展中

3. **創造的認知機能**（30〜100年）
   - 新概念の創出、パラダイムシフト
   - 理論的には可能、技術的課題が残る

## 結論

本章で置いた前提（Physical CTT, Modest / 有限精度・有限時間 / 分布ベースの検証）を採用するなら、人間の知的活動は次の観点から「模倣可能性」を議論できます。

1. （有限精度の範囲で）**計算過程**としてモデル化できる
2. **万能近似定理**により連続関数の近似能力が与えられる
3. **PAC学習理論**により有限サンプルでの統計的保証が与えられる

ただし、これらは次を保証しません。

- **実用上十分なコスト**で再現できること（計算量・データ量・エネルギー）
- **全入力（∀入力）**で一致すること（最悪ケース/敵対的入力を含む）
- **内的体験が同一**であること（機能主義の射程外）

## まとめ

- Physical CTT（Modest）を作業仮説として採用し、脳の情報処理を「計算可能性」の枠内で議論する（反例クラスが成立する場合は再検討が必要）。
- 「有限性」は有限精度・有限時間という観測可能性の前提に依存し、連続系の理想化を排除して「証明」するものではない。
- PAC学習理論や万能近似定理は、「有限観測からの近似」という観点で議論を支える要素になる（ただし保証は分布・確率つき）。
- 知性を計算量で定義することで、知的活動を「探索/最適化」として定量的に整理できる。
- 機能的等価性は「∀入力」ではなく、分布・サンプル・統計保証として扱うのが実務的である。

次回は、この理論的基盤が既存のAI研究とどのように関連し、どこが新しいのかを詳細に分析します。

---

**参考文献**

本書全体の参考文献は、付録Bに集約しています。

- [付録B：参考文献一覧](/appendices/appendix02/)
- [文献集約（編集用）](https://github.com/itdojp/computational-physicalism-book/blob/main/references/bibliography.md)

[^sep-church-turing]: SEP: The Church-Turing Thesis. `[@sep-church-turing]`  
  [plato.stanford.edu/entries/church-turing](https://plato.stanford.edu/entries/church-turing/)
[^sep-computation-physicalsystems]: SEP: Computation in Physical Systems. `[@sep-computation-physicalsystems]`  
  [plato.stanford.edu/archives/fall2015/entries/computation-physicalsystems](https://plato.stanford.edu/archives/fall2015/entries/computation-physicalsystems/)
[^sep-qt-quantcomp]: SEP: Quantum Computing. `[@sep-qt-quantcomp]`  
  [plato.stanford.edu/entries/qt-quantcomp](https://plato.stanford.edu/entries/qt-quantcomp/)
