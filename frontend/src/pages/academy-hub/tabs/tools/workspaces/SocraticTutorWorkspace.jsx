import { useState } from "react";
import {
    ArrowLeft,
    Bot,
    CheckCircle,
    Code2,
    CornerDownLeft,
    HelpCircle,
    Lightbulb,
    Play,
    RotateCcw,
    Send,
    Sparkles,
} from "lucide-react";
import "./EduWorkspaces.css";

const CODE_SAMPLE = `// CS204: Dijkstra Shortest Path Implementation
public int[] dijkstra(int n, List<int[]>[] adj, int src) {
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[src] = 0;
    
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[1] - b[1]);
    pq.offer(new int[]{src, 0});
    
    while (!pq.isEmpty()) {
        int[] curr = pq.poll();
        int u = curr[0], d = curr[1];
        if (d > dist[u]) continue;
        
        for (int[] edge : adj[u]) {
            int v = edge[0], weight = edge[1];
            if (dist[u] + weight < dist[v]) {
                dist[v] = dist[u] + weight;
                pq.offer(new int[]{v, dist[v]});
            }
        }
    }
    return dist;
}`;

export const SocraticTutorWorkspace = ({ onBackToHub }) => {
    const [messages, setMessages] = useState([
        {
            role: "assistant",
            text: "Hello Huy! Let's examine line 13: `if (d > dist[u]) continue;`. Why do you think this condition is essential when using a PriorityQueue with multiple updates?",
        },
    ]);
    const [input, setInput] = useState("");

    const handleSend = () => {
        if (!input.trim()) return;
        const userMsg = { role: "user", text: input };
        setMessages((prev) => [
            ...prev,
            userMsg,
            {
                role: "assistant",
                text: "Good thought! Because standard Java PriorityQueue does not support an efficient decreaseKey operation, older pairs remain in the queue. This check prevents redundant and stale vertex relaxations.",
            },
        ]);
        setInput("");
    };

    return (
        <div className="edu-workspace-root">
            <header className="workspace-header-bar">
                <button type="button" className="btn-back-hub" onClick={onBackToHub}>
                    <ArrowLeft size={14} /> Back to Edu Tools
                </button>
                <div className="workspace-meta-tag">
                    <span className="badge-socratic">SOCRATIC AI</span>
                    <strong>Socratic Code Tutor</strong>
                    <span className="module-crumb">CS204 · Module 4: Graph Algorithms</span>
                </div>
            </header>

            <div className="workspace-double-pane">
                {/* Code Canvas */}
                <div className="workspace-canvas-panel">
                    <div className="panel-tab-title">
                        <Code2 size={14} color="#059669" />
                        <span>DijkstraOptimization.java</span>
                    </div>
                    <pre className="code-editor-block">
                        <code>{CODE_SAMPLE}</code>
                    </pre>
                </div>

                {/* Socratic Chat Panel */}
                <div className="workspace-side-agent">
                    <div className="agent-title-bar">
                        <div className="agent-title-lead">
                            <Bot size={15} color="#059669" />
                            <strong>Socratic Mentoring Assistant</strong>
                        </div>
                        <span className="tutor-mode-tag">Guiding Mode</span>
                    </div>

                    <div className="agent-conversation-flow">
                        {messages.map((m, i) => (
                            <div key={i} className={`chat-bubble-row ${m.role}`}>
                                <div className="chat-bubble-content">{m.text}</div>
                            </div>
                        ))}
                    </div>

                    <div className="agent-composer-box">
                        <div className="quick-hints-row">
                            <button
                                type="button"
                                className="btn-hint"
                                onClick={() =>
                                    setInput(
                                        "Why don't we use a simple Queue instead of PriorityQueue?",
                                    )
                                }
                            >
                                <Lightbulb size={12} /> Compare with BFS Queue
                            </button>
                        </div>
                        <div className="input-with-send">
                            <input
                                type="text"
                                placeholder="Answer the tutor or ask for a step-by-step hint..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            />
                            <button
                                type="button"
                                className="btn-send-agent"
                                onClick={handleSend}
                                disabled={!input.trim()}
                            >
                                <CornerDownLeft size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
