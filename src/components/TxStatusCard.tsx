import { StoredTx } from "../storage/txStore";

export const TxStatusCard = ({ tx }: { tx: StoredTx }) => {
  return (
    <div className="card">
      <div className="flex space-between">
        <strong>{tx.type.toUpperCase()}</strong>
        <span className="badge">{tx.status}</span>
      </div>
      <div className="small muted">Token: {tx.token}</div>
      <div className="small muted">Amount: {tx.amount}</div>
      <div className="small muted">Tx hash:</div>
      <div className="code small">{tx.txHash}</div>
      {tx.explorerUrl ? (
        <div style={{ marginTop: 8 }}>
          <a href={tx.explorerUrl} target="_blank" rel="noreferrer" className="secondary-button">
            View on explorer
          </a>
        </div>
      ) : null}
    </div>
  );
};
