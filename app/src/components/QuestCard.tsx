import styles from "./QuestCard.module.css";

const QUEST_ICONS: Record<string, string> = {
  hold: "\u23F3",
  trade: "\u{1F4B1}",
  refer: "\u{1F91D}",
  stake: "\u{1F512}",
  vote: "\u{1F5F3}\uFE0F",
};

export interface QuestData {
  id: string;
  type: string;
  title: string;
  description: string;
  current: number;
  target: number;
  completed: boolean;
  reward: string;
}

interface QuestCardProps {
  quest: QuestData;
}

export function QuestCard({ quest }: QuestCardProps) {
  const pct = Math.min(100, (quest.current / quest.target) * 100);
  const icon = QUEST_ICONS[quest.type] ?? "\u2B50";
  const barColor = quest.completed ? "var(--success)" : "var(--accent-primary)";

  return (
    <div
      className={`${styles.card} ${quest.completed ? styles.completed : ""}`}
    >
      <div className={styles.icon}>{icon}</div>
      <div className={styles.body}>
        <div className={styles.header}>
          <span className={styles.title}>{quest.title}</span>
          {quest.completed && <span className={styles.check}>&#10003;</span>}
        </div>
        <p className={styles.description}>{quest.description}</p>
        <div className={styles.progressWrap}>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${pct}%`, background: barColor }}
            />
          </div>
          <span className={styles.progressText}>
            {quest.current}/{quest.target}
          </span>
        </div>
        <div className={styles.reward}>{quest.reward}</div>
      </div>
    </div>
  );
}
