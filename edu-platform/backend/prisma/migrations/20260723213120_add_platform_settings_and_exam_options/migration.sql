-- AlterTable
ALTER TABLE "exams" ADD COLUMN     "allow_retake" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shuffle_questions" BOOLEAN NOT NULL DEFAULT false;
