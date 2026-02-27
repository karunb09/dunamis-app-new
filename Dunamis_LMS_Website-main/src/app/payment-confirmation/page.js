import React, { Suspense } from 'react';
import PaymentConfirmation from './PaymentConfirmation';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentConfirmation />
    </Suspense>
  );
}
