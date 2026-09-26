import { useState } from "react";
import {
    ArrowLeft,
    CheckCircle2,
    CheckSquare,
    FileCode,
    Play,
    ShieldAlert,
    Sparkles,
    Upload,
} from "lucide-react";
import "./EduWorkspaces.css";

export const AssignmentGraderWorkspace = ({ onBackToHub }) => {
    const [isGrading, setIsGrading] = useState(false);
    const [resultReady, setResultReady] = useState(true);

    return (
        <div className="edu-workspace-root">
            <header className="workspace-header-bar">
                <button type="button" className="btn-back-hub" onClick={onBackToHub}>
                    <ArrowLeft size={14} /> Back to Edu Tools
                </button>
                <div className="workspace-meta-tag">
                    <span className="badge-socratic blue">AUTO RUBRIC</span>
                    <strong>Assignment & Lab Rubric Grader</strong>
                </div>
            </header>

            <div className="workspace-double-pane">
                {/* Code Submission Area */}
                <div className="workspace-canvas-panel">
                    <div className="submission-toolbar">
                        <strong>Submission: Lab03_GraphRouting.java</strong>
                        <button
                            type="button"
                            className="btn-trigger-grade"
                            onClick={() => {
                                setIsGrading(true);
                                setTimeout(() => setIsGrading(false), 1500);
                            }}
                        >
                            <Play size={13} fill="#ffffff" /> Run Automated Rubric
                        </button>
                    </div>
                    <pre className="code-editor-block">
                        <code>{`// Student Solution - Lab 03
public int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {
    int[] cost = new int[n];
    Arrays.fill(cost, Integer.MAX_VALUE);
    cost[src] = 0;
    
    for (int i = 0; i <= k; i++) {
        int[] temp = Arrays.copyOf(cost, n);
        for (int[] flight : flights) {
            int u = flight[0], v = flight[1], price = flight[2];
            if (cost[u] != Integer.MAX_VALUE && cost[u] + price < temp[v]) {
                temp[v] = cost[u] + price;
            }
        }
        cost = temp;
    }
    return cost[dst] == Integer.MAX_VALUE ? -1 : cost[dst];
}`}</code>
                    </pre>
                </div>

                {/* Rubric Evaluation Scorecard */}
                <div className="workspace-rubric-card">
                    <div className="rubric-summary-score">
                        <div className="score-ring">95/100</div>
                        <div>
                            <h4>Overall Lab Evaluation: Excellent</h4>
                            <p>
                                Meets optimal Bellman-Ford variant constraints with limited stops.
                            </p>
                        </div>
                    </div>

                    <div className="rubric-checklist">
                        <div className="check-item passed">
                            <CheckCircle2 size={16} />
                            <div>
                                <strong>Functional Unit Tests (10/10 Passed)</strong>
                                <small>
                                    All edge cases (disconnected nodes, cycle bounds) executed
                                    successfully.
                                </small>
                            </div>
                        </div>

                        <div className="check-item passed">
                            <CheckCircle2 size={16} />
                            <div>
                                <strong>Time Complexity Efficiency: $O(K \times E)$</strong>
                                <small>
                                    Meets Big-O requirements without nested redundant traversals.
                                </small>
                            </div>
                        </div>

                        <div className="check-item warning">
                            <ShieldAlert size={16} />
                            <div>
                                <strong>Clean Code & In-line Comments (-5 pts)</strong>
                                <small>
                                    Missing Javadoc descriptions explaining array copy logic on line
                                    8.
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
