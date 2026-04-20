/*
  Warnings:

  - A unique constraint covering the columns `[googleId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[facebookId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE', 'FACEBOOK');

-- CreateEnum
CREATE TYPE "VIPTier" AS ENUM ('NONE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TargetAudience" AS ENUM ('ALL', 'REGULAR', 'VIP', 'INACTIVE', 'NEW', 'AREA');

-- CreateEnum
CREATE TYPE "WalletTxnType" AS ENUM ('TOPUP', 'PAYMENT', 'REFUND', 'BONUS');

-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('ACTIVE', 'REDEEMED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('WAITING', 'IN_SERVICE', 'COMPLETED', 'LEFT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MessageType" ADD VALUE 'FEEDBACK_REQUEST';
ALTER TYPE "MessageType" ADD VALUE 'REBOOKING';
ALTER TYPE "MessageType" ADD VALUE 'GOOGLE_REVIEW';
ALTER TYPE "MessageType" ADD VALUE 'MILESTONE';
ALTER TYPE "MessageType" ADD VALUE 'REFERRAL';
ALTER TYPE "MessageType" ADD VALUE 'MEMBERSHIP_RENEWAL';
ALTER TYPE "MessageType" ADD VALUE 'WALLET_LOW';
ALTER TYPE "MessageType" ADD VALUE 'GIFT_VOUCHER';
ALTER TYPE "MessageType" ADD VALUE 'WAITLIST_ALERT';
ALTER TYPE "MessageType" ADD VALUE 'QUEUE_NOTIFICATION';

-- AlterEnum
ALTER TYPE "PaymentMode" ADD VALUE 'WALLET';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'OWNER';

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "afterPhoto" TEXT,
ADD COLUMN     "beforePhoto" TEXT,
ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "groupName" TEXT,
ADD COLUMN     "isGroup" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "allergies" TEXT,
ADD COLUMN     "area" TEXT,
ADD COLUMN     "beverage" TEXT,
ADD COLUMN     "musicPref" TEXT,
ADD COLUMN     "preferredStylistId" TEXT,
ADD COLUMN     "vipTier" "VIPTier" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "couponCode" TEXT,
ADD COLUMN     "couponDiscount" DOUBLE PRECISION,
ADD COLUMN     "giftVoucherId" TEXT,
ADD COLUMN     "voucherDiscount" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "walletUsed" DOUBLE PRECISION DEFAULT 0;

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "attendanceTrackingEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "defaultCommissionPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "feedbackRequestTemplate" TEXT,
ADD COLUMN     "googleReviewTemplate" TEXT,
ADD COLUMN     "googleReviewUrl" TEXT,
ADD COLUMN     "maxAppointmentsPerStylist" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "membershipRenewalTemplate" TEXT,
ADD COLUMN     "milestoneTemplate" TEXT,
ADD COLUMN     "minBreakMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "onlineBookingEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "queueAutoRefreshSec" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "queueCallTemplate" TEXT,
ADD COLUMN     "queueEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "queueEstimatedWaitMin" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "queueMaxWaiting" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "queueNotifyOnCall" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "rebookingTemplate" TEXT,
ADD COLUMN     "referralRewardAmount" DOUBLE PRECISION DEFAULT 200,
ADD COLUMN     "referralTemplate" TEXT,
ADD COLUMN     "staffCanViewOwnCommission" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "staffCanViewOwnSchedule" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "walletLowBalanceThreshold" DOUBLE PRECISION DEFAULT 200,
ADD COLUMN     "walletLowTemplate" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "commissionPercent" DOUBLE PRECISION,
ADD COLUMN     "facebookId" TEXT,
ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "provider" "AuthProvider" NOT NULL DEFAULT 'LOCAL',
ALTER COLUMN "password" DROP NOT NULL;

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "googleReviewSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "couponCode" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "minBillAmount" DOUBLE PRECISION DEFAULT 0,
    "maxDiscount" DOUBLE PRECISION,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "applicableServices" TEXT,
    "targetAudience" "TargetAudience" NOT NULL DEFAULT 'ALL',
    "targetArea" TEXT,
    "messageTemplate" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_logs" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_plan_services" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "usageLimit" INTEGER NOT NULL,

    CONSTRAINT "membership_plan_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_memberships" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "usageLog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "WalletTxnType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_vouchers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "purchaserId" TEXT,
    "redeemedById" TEXT,
    "recipientName" TEXT,
    "recipientPhone" TEXT,
    "message" TEXT,
    "status" "VoucherStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upsells" (
    "id" TEXT NOT NULL,
    "baseServiceId" TEXT NOT NULL,
    "suggestedServiceId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "discountedPrice" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "upsells_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "restockDays" INTEGER DEFAULT 45,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_sales" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "customerId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredId" TEXT NOT NULL,
    "referrerReward" DOUBLE PRECISION,
    "referredReward" DOUBLE PRECISION,
    "isConverted" BOOLEAN NOT NULL DEFAULT false,
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "happy_hours" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "daysOfWeek" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "happy_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "preferredTime" TEXT,
    "serviceIds" TEXT,
    "isNotified" BOOLEAN NOT NULL DEFAULT false,
    "isFulfilled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_entries" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT,
    "phone" TEXT,
    "serviceIds" TEXT,
    "estimatedWait" INTEGER,
    "status" "QueueStatus" NOT NULL DEFAULT 'WAITING',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "queue_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_commissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tips" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMode" TEXT NOT NULL DEFAULT 'CASH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vip_tier_configs" (
    "id" TEXT NOT NULL,
    "tier" "VIPTier" NOT NULL,
    "minVisits" INTEGER NOT NULL DEFAULT 0,
    "minSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "perks" TEXT,

    CONSTRAINT "vip_tier_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feedbacks_appointmentId_key" ON "feedbacks"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_couponCode_key" ON "campaigns"("couponCode");

-- CreateIndex
CREATE UNIQUE INDEX "membership_plan_services_planId_serviceId_key" ON "membership_plan_services"("planId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "gift_vouchers_code_key" ON "gift_vouchers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "upsells_baseServiceId_suggestedServiceId_key" ON "upsells"("baseServiceId", "suggestedServiceId");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referrerId_referredId_key" ON "referrals"("referrerId", "referredId");

-- CreateIndex
CREATE UNIQUE INDEX "vip_tier_configs_tier_key" ON "vip_tier_configs"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "users_facebookId_key" ON "users"("facebookId");

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_logs" ADD CONSTRAINT "campaign_logs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_logs" ADD CONSTRAINT "campaign_logs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_plan_services" ADD CONSTRAINT "membership_plan_services_planId_fkey" FOREIGN KEY ("planId") REFERENCES "membership_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_plan_services" ADD CONSTRAINT "membership_plan_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_memberships" ADD CONSTRAINT "customer_memberships_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_memberships" ADD CONSTRAINT "customer_memberships_planId_fkey" FOREIGN KEY ("planId") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_vouchers" ADD CONSTRAINT "gift_vouchers_purchaserId_fkey" FOREIGN KEY ("purchaserId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_vouchers" ADD CONSTRAINT "gift_vouchers_redeemedById_fkey" FOREIGN KEY ("redeemedById") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upsells" ADD CONSTRAINT "upsells_baseServiceId_fkey" FOREIGN KEY ("baseServiceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upsells" ADD CONSTRAINT "upsells_suggestedServiceId_fkey" FOREIGN KEY ("suggestedServiceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_sales" ADD CONSTRAINT "product_sales_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_sales" ADD CONSTRAINT "product_sales_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_commissions" ADD CONSTRAINT "staff_commissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_commissions" ADD CONSTRAINT "staff_commissions_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tips" ADD CONSTRAINT "tips_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
