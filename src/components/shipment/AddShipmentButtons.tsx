interface Props {
  onAdd: (kind: 'DELHIVERY' | 'DTDC' | 'SHADOWFAX' | 'SELF') => void;
}

export function AddShipmentButtons({ onAdd }: Props) {
  const buttons: { kind: 'DELHIVERY' | 'DTDC' | 'SHADOWFAX' | 'SELF'; label: string }[] = [
    { kind: 'DELHIVERY', label: '+ Delhivery Shipment' },
    { kind: 'DTDC', label: '+ DTDC Shipment' },
    { kind: 'SHADOWFAX', label: '+ Shadowfax Shipment' },
    { kind: 'SELF', label: '+ Self Shipped' },
  ];

  return (
    <div className="flex gap-2">
      {buttons.map((b) => (
        <button key={b.kind} type="button" className="btn btn-secondary py-2 px-3 text-sm" onClick={() => onAdd(b.kind)}>
          {b.label}
        </button>
      ))}
    </div>
  );
}
