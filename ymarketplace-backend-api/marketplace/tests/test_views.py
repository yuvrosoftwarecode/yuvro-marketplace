from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from marketplace.models import Company, Job, JobStatus

User = get_user_model()


class MarketplaceAPITests(APITestCase):
    def setUp(self):
        # AM 1
        self.am_user1 = User.objects.create_user(
            email="am1@yuvro.test",
            password="password123",
            role=User.Role.RECRUITER_ACCOUNT_MANAGER,
        )
        # AM 2
        self.am_user2 = User.objects.create_user(
            email="am2@yuvro.test",
            password="password123",
            role=User.Role.RECRUITER_ACCOUNT_MANAGER,
        )
        # Freelancer Recruiter
        self.freelancer = User.objects.create_user(
            email="recruiter@yuvro.test",
            password="password123",
            role=User.Role.RECRUITER_FREELANCER,
        )
        # Admin
        self.admin_user = User.objects.create_superuser(
            email="admin@yuvro.test",
            password="password123",
            role=User.Role.RECRUITER_ACCOUNT_MANAGER,
        )

        # Pre-seed Company and Job owned by AM 1
        self.company1 = Company.objects.create(
            name="Within",
            account_manager=self.am_user1,
            industry="Document intelligence / AI infrastructure",
            headquarters="San Francisco, CA",
        )
        self.job1 = Job.objects.create(
            company=self.company1,
            title="Senior/Staff AI Frontend Engineer",
            location="San Francisco, CA",
            salary_min=Decimal("210000.00"),
            salary_max=Decimal("265000.00"),
            company_to_yuvro_percentage=Decimal("20.00"),
            yuvro_commission_percentage=Decimal("5.00"),
            status=JobStatus.ACTIVE,
        )

    # --- Company Endpoint Tests ---

    def test_account_manager_create_company(self):
        self.client.force_authenticate(user=self.am_user1)
        response = self.client.post(
            "/api/marketplace/companies/",
            {
                "name": "Helio Systems",
                "website": "heliosystems.com",
                "logo_url": "heliosystems.com/logo.png",
                "industry": "Observability",
                "headquarters": "London, UK",
                "status": "active",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Helio Systems")
        self.assertEqual(response.data["website"], "https://heliosystems.com")
        self.assertEqual(response.data["logo_url"], "https://heliosystems.com/logo.png")
        self.assertEqual(str(response.data["account_manager"]), str(self.am_user1.id))

    def test_account_manager_upload_logo(self):
        from io import BytesIO
        from PIL import Image
        from django.core.files.uploadedfile import SimpleUploadedFile

        self.client.force_authenticate(user=self.am_user1)
        buf = BytesIO()
        Image.new("RGB", (30, 30), color="blue").save(buf, format="PNG")
        logo_file = SimpleUploadedFile("test_logo.png", buf.getvalue(), content_type="image/png")

        response = self.client.post(
            "/api/marketplace/companies/upload-logo/",
            {"logo": logo_file},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("url", response.data)
        self.assertIn("key", response.data)
        self.assertTrue(len(response.data["url"]) > 0)

    def test_account_manager_create_company_with_logo_file(self):
        from io import BytesIO
        from PIL import Image
        from django.core.files.uploadedfile import SimpleUploadedFile

        self.client.force_authenticate(user=self.am_user1)
        buf = BytesIO()
        Image.new("RGB", (30, 30), color="red").save(buf, format="PNG")
        logo_file = SimpleUploadedFile("brand_logo.png", buf.getvalue(), content_type="image/png")

        response = self.client.post(
            "/api/marketplace/companies/",
            {
                "name": "CloudVex Technologies",
                "website": "cloudvex.io",
                "logo": logo_file,
                "industry": "Cloud Infrastructure",
                "headquarters": "Bengaluru, India",
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "CloudVex Technologies")
        self.assertTrue(response.data["logo_url"])

    def test_freelancer_cannot_create_company(self):
        self.client.force_authenticate(user=self.freelancer)
        response = self.client.post(
            "/api/marketplace/companies/",
            {"name": "Unauthorized Company"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_freelancer_can_read_companies_and_jobs(self):
        self.client.force_authenticate(user=self.freelancer)
        # Read company list
        c_res = self.client.get("/api/marketplace/companies/")
        self.assertEqual(c_res.status_code, status.HTTP_200_OK)

        # Read job list
        j_res = self.client.get("/api/marketplace/jobs/")
        self.assertEqual(j_res.status_code, status.HTTP_200_OK)

        # Read job detail
        detail_res = self.client.get(f"/api/marketplace/jobs/{self.job1.id}/")
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_res.data["title"], "Senior/Staff AI Frontend Engineer")
        self.assertIn("company", detail_res.data)
        self.assertEqual(detail_res.data["company"]["name"], "Within")
        self.assertEqual(detail_res.data["bounty"]["recruiter_percentage"], 15.0)
        self.assertEqual(detail_res.data["bounty"]["min"], 31500.0)
        self.assertEqual(detail_res.data["bounty"]["max"], 39750.0)

    # --- IDOR Protection Tests ---

    def test_idor_account_manager_cannot_modify_other_am_company(self):
        # AM 2 tries to modify Company owned by AM 1
        self.client.force_authenticate(user=self.am_user2)
        response = self.client.patch(
            f"/api/marketplace/companies/{self.company1.id}/",
            {"name": "Hacked Name"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_idor_account_manager_cannot_modify_other_am_job(self):
        # AM 2 tries to modify Job owned by AM 1's Company
        self.client.force_authenticate(user=self.am_user2)
        response = self.client.patch(
            f"/api/marketplace/jobs/{self.job1.id}/",
            {"title": "Modified Title"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_idor_account_manager_cannot_create_job_for_other_am_company(self):
        # AM 2 tries to create a Job for AM 1's Company
        self.client.force_authenticate(user=self.am_user2)
        response = self.client.post(
            "/api/marketplace/jobs/",
            {
                "company_id": str(self.company1.id),
                "title": "Unauthorized Job",
                "location": "Remote",
                "salary_min": "100000.00",
                "salary_max": "120000.00",
                "company_to_yuvro_percentage": "20.00",
                "yuvro_commission_percentage": "5.00",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_modify_any_company_and_job(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(
            f"/api/marketplace/companies/{self.company1.id}/",
            {"name": "Admin Updated Within"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Admin Updated Within")

    # --- Filtering Tests ---

    def test_job_filtering_by_status_and_company(self):
        self.client.force_authenticate(user=self.am_user1)
        # Create draft job
        draft_job = Job.objects.create(
            company=self.company1,
            title="Draft Backend Engineer",
            location="New York, NY",
            status=JobStatus.DRAFT,
            salary_min=Decimal("150000.00"),
            salary_max=Decimal("180000.00"),
            company_to_yuvro_percentage=Decimal("20.00"),
            yuvro_commission_percentage=Decimal("5.00"),
        )

        res_active = self.client.get(
            f"/api/marketplace/jobs/?company={self.company1.id}&status=active"
        )
        self.assertEqual(res_active.status_code, status.HTTP_200_OK)
        data = res_active.data.get("results", res_active.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["id"], str(self.job1.id))

        res_draft = self.client.get(
            f"/api/marketplace/jobs/?company={self.company1.id}&status=draft"
        )
        self.assertEqual(res_draft.status_code, status.HTTP_200_OK)
        draft_data = res_draft.data.get("results", res_draft.data)
        self.assertEqual(len(draft_data), 1)
        self.assertEqual(draft_data[0]["id"], str(draft_job.id))

    def test_account_manager_update_and_delete_job(self):
        self.client.force_authenticate(user=self.am_user1)
        # Patch job
        res_patch = self.client.patch(
            f"/api/marketplace/jobs/{self.job1.id}/",
            {"title": "Staff AI Frontend Engineer", "open_roles": 5},
            format="json",
        )
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        self.assertEqual(res_patch.data["title"], "Staff AI Frontend Engineer")
        self.assertEqual(res_patch.data["open_roles"], 5)

        # Delete job
        res_del = self.client.delete(f"/api/marketplace/jobs/{self.job1.id}/")
        self.assertEqual(res_del.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Job.objects.filter(id=self.job1.id).exists())

    def test_search_jobs_and_companies(self):
        self.client.force_authenticate(user=self.am_user1)
        # Search jobs by title query
        res_j = self.client.get("/api/marketplace/jobs/?search=Frontend")
        self.assertEqual(res_j.status_code, status.HTTP_200_OK)
        j_data = res_j.data.get("results", res_j.data)
        self.assertEqual(len(j_data), 1)

        # Search companies by name query
        res_c = self.client.get("/api/marketplace/companies/?search=Within")
        self.assertEqual(res_c.status_code, status.HTTP_200_OK)
        c_data = res_c.data.get("results", res_c.data)
        self.assertEqual(len(c_data), 1)

    def test_unauthenticated_request_rejected(self):
        self.client.logout()
        res = self.client.get("/api/marketplace/companies/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
