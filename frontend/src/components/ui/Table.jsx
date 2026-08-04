export function Table({ children }) {
  return (
    <div className="data-table-wrapper">
      <table className="data-table">
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ headers }) {
  return (
    <thead>
      <tr>
        {headers.map((h, i) => (
          <th key={i}>{h}</th>
        ))}
      </tr>
    </thead>
  );
}

export function TableBody({ children }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({ children, onClick, style }) {
  return (
    <tr onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', ...style }}>
      {children}
    </tr>
  );
}

export function TableCell({ children, align = "left", className = "", style }) {
  return (
    <td align={align} className={className} style={style}>
      {children}
    </td>
  );
}
