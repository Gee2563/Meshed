import { ethers } from "ethers";

import { env } from "@/lib/config/env";
import type {
  CrossChainVerificationService,
  DataTriggerService,
  ExternalMilestoneVerificationService,
  PaymentVerificationService,
  VerificationPayload,
  VerificationResult,
} from "@/lib/server/adapters/flare/types";
import { ApiError } from "@/lib/server/http";

function requireRpcUrl() {
  if (!env.FLARE_RPC_URL?.trim()) {
    throw new ApiError(500, "FLARE_RPC_URL is required for real Flare verification.");
  }
  return env.FLARE_RPC_URL;
}

function normalizePrivateKey(privateKey: string) {
  return privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
}

function getProvider() {
  return new ethers.JsonRpcProvider(requireRpcUrl());
}

function getSigner() {
  if (!env.PRIVATE_KEY?.trim()) {
    throw new ApiError(500, "PRIVATE_KEY is required for real external attestations.");
  }

  return new ethers.Wallet(normalizePrivateKey(env.PRIVATE_KEY), getProvider());
}

async function verifyTransactionOnFlare(
  payload: VerificationPayload,
  type: "payment" | "cross-chain",
): Promise<VerificationResult> {
  if (!payload.txHash?.trim()) {
    return {
      verified: false,
      status: "rejected",
      providerRef: `flare:rpc:${type}:${payload.milestoneId}:missing_tx_hash`,
      metadata: {
        reason: "Missing transaction hash.",
      },
    };
  }

  const provider = getProvider();
  const receipt = await provider.getTransactionReceipt(payload.txHash);
  if (!receipt) {
    return {
      verified: false,
      status: "rejected",
      providerRef: `flare:rpc:${type}:${payload.milestoneId}:tx_not_found`,
      metadata: {
        txHash: payload.txHash,
      },
    };
  }

  const verified = receipt.status === 1;
  const network = await provider.getNetwork();
  return {
    verified,
    status: verified ? "verified" : "rejected",
    providerRef: `flare:rpc:${type}:${payload.txHash}`,
    metadata: {
      chainId: Number(network.chainId),
      txHash: payload.txHash,
      blockNumber: Number(receipt.blockNumber),
      status: Number(receipt.status),
    },
  };
}

export class RealPaymentVerificationService implements PaymentVerificationService {
  async verifyPayment(payload: VerificationPayload): Promise<VerificationResult> {
    return verifyTransactionOnFlare(payload, "payment");
  }
}

export class RealExternalVerificationService implements ExternalMilestoneVerificationService {
  async verifyExternalEvent(payload: VerificationPayload): Promise<VerificationResult> {
    const signer = getSigner();
    const signerProvider = signer.provider ?? getProvider();
    const network = await signerProvider.getNetwork();
    const evidenceReference = payload.evidenceReference?.trim() ?? "";
    const digest = ethers.keccak256(
      ethers.toUtf8Bytes(
        JSON.stringify({
          chainId: Number(network.chainId),
          milestoneId: payload.milestoneId,
          evidenceReference,
          issuedAt: new Date().toISOString(),
        }),
      ),
    );
    const signature = await signer.signMessage(ethers.getBytes(digest));

    return {
      verified: true,
      status: "verified",
      providerRef: `flare:oracle-signature:${digest}`,
      metadata: {
        chainId: Number(network.chainId),
        signer: await signer.getAddress(),
        digest,
        signature,
      },
    };
  }
}

export class RealCrossChainVerificationService implements CrossChainVerificationService {
  async verifyCrossChainEvent(payload: VerificationPayload): Promise<VerificationResult> {
    return verifyTransactionOnFlare(payload, "cross-chain");
  }
}

export class RealDataTriggerService implements DataTriggerService {
  async evaluateTrigger(
    payload: VerificationPayload & { eligible: boolean },
  ): Promise<VerificationResult> {
    return {
      verified: payload.eligible,
      status: payload.eligible ? "verified" : "rejected",
      providerRef: `flare:data-trigger:${payload.milestoneId}`,
      metadata: {
        eligible: payload.eligible,
      },
    };
  }
}
