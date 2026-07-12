export function SourceCitation({ citation }: { citation: any }) {
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs cursor-pointer hover:bg-blue-200">
      📄 {citation.filename}{citation.page ? `, p.${citation.page}` : ''}
    </span>
  );
}
