<div align="center">
  
# 🚀 Opptra Discount Engine

**An intelligent, natural-language powered discount calculation engine built for modern e-commerce.**

[![Deployed on Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=for-the-badge&logo=vercel)](https://opptra-fde-assignment.vercel.app/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)

[**Live Demo**](https://opptra-fde-assignment.vercel.app/) • [**Explore Features**](#✨-key-features) • [**Local Setup**](#💻-run-locally) • [**Architecture**](#🏗️-architecture--design)

</div>

---
demo : https://opptra-fde-assignment.vercel.app/

## 🌟 The Hook: Why This Engine?

Calculating discounts shouldn't require a Ph.D. in computer science. This engine takes a radically simplified approach: you speak **plain English**, and it computes the optimal discount path for your cart. 

Whether it's *"20% off for Natura Casa brand, stackable"* or evaluating massive CSV carts, this engine processes it seamlessly using **Gemini LLM integration** alongside a blazing-fast local engine.

---

## ✨ Key Features

### 🛒 1. Advanced Cart-Level Offers
* **Smart Thresholds:** Easily configure `min_cart_value` conditions for global discounts.
* **Intelligent Sequencing:** Item-level discounts are resolved *before* evaluating cart-level rules to ensure mathematically perfect final totals.

### 🧠 2. Natural Language Rule Input (The Magic)
Why write regex or JSON when you can just type? 
* **✦ Gemini Powered:** Integrates Gemini 2.0 Flash to parse conversational rule descriptions into structured logic.
* **⚙️ Local Fallback:** No API key? No problem. A deterministic regex fallback engine guarantees zero downtime for common patterns.
* **Bulletproof Validation:** AI hallucinations are caught instantly before they touch the engine. 

### 📄 3. Zero-Backend PDF Cart Parsing
* Upload a PDF receipt directly in the browser!
* Uses client-side `pdfjs-dist` to magically map rows to `CartItem` objects.
* Fault-tolerant: Malformed rows are isolated, preserving the rest of your cart data.

---
ss:

<img width="1576" height="764" alt="Screenshot 2026-06-30 222412" src="https://github.com/user-attachments/assets/fa3551fc-a327-4136-a786-033d3482195e" />
<img width="1596" height="641" alt="Screenshot 2026-06-30 222502" src="https://github.com/user-attachments/assets/8c8717f4-013d-46e5-ac40-f259aebd4102" />

## 💻 Run Locally

Want to take it for a spin on your own machine? It's as easy as pie.

```bash
# 1. Install dependencies
npm install

# 2. Fire up the dev server
npm run dev
```

Open `http://localhost:5173`. 
> **Quick Start:** Upload `sample-data/rules.csv` and `sample-data/cart.csv`, then click **Calculate Discounts** to see the magic happen!

---

## 📊 Expected Output

If you use the provided `sample-data/rules.csv` and `sample-data/cart.csv`, here is the mathematically verified result:

| Item | Final Price | Applied Rule(s) |
| :--- | ---: | :--- |
| **ITEM-01** | Rs.1,104 | `RULE-01` |
| **ITEM-02** | Rs.629 | `RULE-02` + `RULE-03` |
| **ITEM-03** | Rs.509 | `RULE-01` |
| **ITEM-04** | Rs.2,499 | *No offers available* |
| **ITEM-05** | Rs.382 | `RULE-01` |
| **ITEM-06** | Rs.809 | `RULE-03` |

> **Item subtotal:** `Rs.5,932` <br>
> **Cart offer:** `- Rs.593` <br>
> **Final cart total: `Rs.5,339`**

---

## 🏗️ Architecture & Design

### **1. Input Adapters Stay Separate**
CSV parsing, PDF parsing, and natural language AI parsing all converge into uniform `DiscountRule` or `CartItem` shapes *before* the engine ever sees them. This separation of concerns means the engine remains pure, testable, and lightning fast.

### **2. 100% Client-Side Architecture**
Everything runs in the browser. PDF parsing uses `pdfjs-dist` to evaluate y-position matrices without needing a Node.js backend. 

### **3. Dual-Brain Parsing Strategy**
When a Gemini API key is provided, the app taps into **Gemini 2.0 Flash** for maximum flexibility. When unavailable, it seamlessly degrades to a highly tuned **deterministic regex parser**. Your API key never leaves your React state and is only transmitted directly to Google.

---

## 📂 Project Structure

```text
src/
 ├── engine/
 │    ├── discountEngine.js   # Pure discount calculation logic
 │    ├── csvParser.js        # Maps CSV rows to typed objects
 │    ├── nlRuleParser.js     # Deterministic regex fallback
 │    ├── geminiParser.js     # LLM Rule Parser
 │    └── pdfParser.js        # Advanced client-side PDF data extraction
 ├── components/
 │    ├── CsvUploader.jsx
 │    ├── DataTable.jsx
 │    └── ErrorBanner.jsx
 ├── App.jsx
 └── main.jsx

sample-data/
 ├── rules.csv
 └── cart.csv
```


