import { Suspense } from "react";
import IndexView from "@/views/IndexView";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <IndexView />
    </Suspense>
  );
}
