"use client";
import { useFormStatus } from "react-dom";
import { createSecret, revokeSecret } from "@/lib/actions/governance";
function Submit({label}:{label:string}){const {pending}=useFormStatus();return <button disabled={pending} className="btn-primary disabled:opacity-50">{pending?"Saving…":label}</button>}
export function SecretCreateForm(){return <form action={createSecret} className="neon-card p-5 grid md:grid-cols-4 gap-3"><input name="name" required placeholder="Name e.g. Production API" className="input"/><input name="provider" required placeholder="Provider" className="input"/><input name="secret_ref" required placeholder="Secret manager reference" className="input"/><Submit label="Add reference"/></form>}
export function RevokeSecretButton({id}:{id:string}){return <form action={revokeSecret}><input type="hidden" name="id" value={id}/><button className="text-xs text-neon-pink hover:text-neon-pink/80">Revoke</button></form>}
