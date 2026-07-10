import { useEffect, useState } from "react";
import useTimer from "./useTimer";
function companyajtj() {
  const count = useTimer(100);

  return (
    <div>
      <p>{count}</p>
      <p>companyajtj</p>
    </div>
  );
}

export default companyajtj;
