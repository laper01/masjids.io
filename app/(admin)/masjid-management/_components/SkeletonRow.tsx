export function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-[#eaedff]">
      <td className="px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-[#eaedff] shrink-0" />
          <div className="space-y-2">
            <div className="h-3.5 w-36 bg-[#eaedff] rounded" />
            <div className="h-2.5 w-20 bg-[#f2f3ff] rounded" />
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="h-6 w-32 bg-[#f2f3ff] rounded-full" />
      </td>
      <td className="px-6 py-5">
        <div className="h-3 w-24 bg-[#eaedff] rounded" />
      </td>
      <td className="px-6 py-5">
        <div className="h-5 w-20 bg-[#f2f3ff] rounded-full" />
      </td>
      <td className="px-6 py-5 text-right">
        <div className="h-8 w-8 bg-[#eaedff] rounded-lg ml-auto" />
      </td>
    </tr>
  );
}
