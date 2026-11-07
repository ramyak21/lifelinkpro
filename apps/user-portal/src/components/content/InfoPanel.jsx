import Card, { CardHeader } from "@lifelink/shared/components/ui/Card";
import cx from "@lifelink/shared/utils/cx";
import styles from "./InfoPanel.module.css";

// Guidance panel: "What happens next" (numbered) or a list of tips (icons)
// items: [{ title?, text, icon? }]
export default function InfoPanel({ title, description, items, numbered = false }) {
  const List = numbered ? "ol" : "ul";

  return (
    <Card padding="md">
      <CardHeader title={title} description={description} as="h2" />
      <List className={cx(styles.list, numbered && styles.numbered)}>
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <li key={item.title || item.text} className={styles.item}>
              <span className={styles.marker} aria-hidden="true">
                {numbered ? index + 1 : Icon ? <Icon /> : null}
              </span>
              <div>
                {item.title && <p className={styles.itemTitle}>{item.title}</p>}
                <p className={styles.itemText}>{item.text}</p>
              </div>
            </li>
          );
        })}
      </List>
    </Card>
  );
}
