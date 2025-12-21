# DemoWise: Calendar-Driven Cloud Orchestration



**DemoWise** is an automated infrastructure orchestrator that aligns your cloud compute resources with your actual work schedule. By connecting **Signals** (like Google Calendar) to **Compute Resources** (like AWS EC2), it automatically spins up expensive GPU clusters or demo environments right before you need them and shuts them down immediately after.

> **Problem:** Engineers often leave development/demo servers running 24/7, wasting money.
> **Solution:** If a "Sales Demo" is on the calendar for 2:00 PM, the server should start automatically at 1:50 PM and stop at 3:00 PM.

---

## ⚡ Features

* **🔌 Universal Signals:** Seamless integration with **Google Calendar** via Webhooks (Push Notifications).
* **☁️ Multi-Cloud Support:** Currently supports **AWS EC2** (Start/Stop instances).
* **🔐 Secure IAM Handling:** Uses AWS STS `AssumeRole` with External IDs, so you never store sensitive long-term root credentials for target resources.
* **🧠 Logic Engine:** Define flexible triggers (e.g., *If event contains "Deep Learning", start "GPU-Cluster-1" 15 mins early*).
* **⏳ Serverless Scheduling:** Powered by **Upstash QStash** to handle reliable job scheduling and delivery.
* **📊 Real-time Dashboard:** Visualize active signals, resource status, and forecasted savings.

---

## 🛠 Tech Stack

* **Framework:** Next.js 14 (App Router)
* **Language:** TypeScript
* **Database:** PostgreSQL (via **Neon DB**) & Prisma ORM
* **Queue/Scheduling:** Upstash QStash
* **Auth:** NextAuth (Google Provider)
* **Cloud SDKs:** AWS SDK v3 (EC2, STS), Googleapis
* **Styling:** Tailwind CSS + Lucide Icons

---

## 🚀 Getting Started

### Prerequisites
* Node.js 18+
* A Google Cloud Project (for OAuth and Calendar API)
* An AWS Account (for creating IAM Users/Roles)
* An Upstash Account (for QStash)
* A Neon/PostgreSQL Database

### 1. Clone the Repository
```bash
git clone [https://github.com/your-username/demowise.git](https://github.com/your-username/demowise.git)
cd demowise# DemoWise: Calendar-Driven Cloud Orchestration



**DemoWise** is an automated infrastructure orchestrator that aligns your cloud compute resources with your actual work schedule. By connecting **Signals** (like Google Calendar) to **Compute Resources** (like AWS EC2), it automatically spins up expensive GPU clusters or demo environments right before you need them and shuts them down immediately after.

> **Problem:** Engineers often leave development/demo servers running 24/7, wasting money.
> **Solution:** If a "Sales Demo" is on the calendar for 2:00 PM, the server should start automatically at 1:50 PM and stop at 3:00 PM.

---

## ⚡ Features

* **🔌 Universal Signals:** Seamless integration with **Google Calendar** via Webhooks (Push Notifications).
* **☁️ Multi-Cloud Support:** Currently supports **AWS EC2** (Start/Stop instances).
* **🔐 Secure IAM Handling:** Uses AWS STS `AssumeRole` with External IDs, so you never store sensitive long-term root credentials for target resources.
* **🧠 Logic Engine:** Define flexible triggers (e.g., *If event contains "Deep Learning", start "GPU-Cluster-1" 15 mins early*).
* **⏳ Serverless Scheduling:** Powered by **Upstash QStash** to handle reliable job scheduling and delivery.
* **📊 Real-time Dashboard:** Visualize active signals, resource status, and forecasted savings.

---

## 🛠 Tech Stack

* **Framework:** Next.js 14 (App Router)
* **Language:** TypeScript
* **Database:** PostgreSQL (via **Neon DB**) & Prisma ORM
* **Queue/Scheduling:** Upstash QStash
* **Auth:** NextAuth (Google Provider)
* **Cloud SDKs:** AWS SDK v3 (EC2, STS), Googleapis
* **Styling:** Tailwind CSS + Lucide Icons

---

## 🚀 Getting Started

### Prerequisites
* Node.js 18+
* A Google Cloud Project (for OAuth and Calendar API)
* An AWS Account (for creating IAM Users/Roles)
* An Upstash Account (for QStash)
* A Neon/PostgreSQL Database

### 1. Clone the Repository
```bash
git clone [https://github.com/your-username/demowise.git](https://github.com/your-username/demowise.git)
cd demowise